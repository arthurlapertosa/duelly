import type { DataSource } from 'typeorm';
import type { AppConfig } from '../../config/env.js';
import { sports, type DiscoveryMode, type Sport, type TemplateFilterResult } from '../../modules/templates/domain/types.js';
import { DiscoveryAdapter } from '../../modules/templates/discovery/discovery-adapter.js';
import { TemplateFilterService } from '../../modules/templates/filtering/template-filter.service.js';
import { TemplateRepository } from '../../modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../../modules/templates/publisher/template-publisher.service.js';

export interface TemplateControllerOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

export interface TemplateQuery {
  mode?: DiscoveryMode;
  sport?: Sport;
}

export interface PublishBody {
  templateId?: string;
  publishedBy?: string;
}

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');
const DISCOVERY_CACHE_TTL_MS = 60_000;

export class TemplateControllerContext {
  readonly adapter: DiscoveryAdapter;
  readonly filter = new TemplateFilterService();
  readonly repository: TemplateRepository;
  readonly publisher = new TemplatePublisherService();
  readonly config: AppConfig;
  private readonly discoveryCache = new Map<string, { expiresAt: number; result: TemplateFilterResult }>();
  private readonly inFlightDiscovery = new Map<string, Promise<TemplateFilterResult>>();

  constructor(options: TemplateControllerOptions) {
    this.config = options.config;
    this.adapter = new DiscoveryAdapter(options.config);
    this.repository = new TemplateRepository(options.dataSource);
  }

  validateMode(query: { mode?: DiscoveryMode }) {
    const mode = this.resolveMode(query);
    if (mode === 'live' && !this.config.polymarket.liveDiscoveryEnabled) {
      return (reply: { code: (statusCode: number) => void }) => {
        reply.code(403);
        return { status: 'error', code: 'LIVE_DISCOVERY_DISABLED' };
      };
    }
    return undefined;
  }

  async discoverAndFilter(query: { mode?: DiscoveryMode; sport?: Sport }) {
    const mode = this.resolveMode(query);
    const cacheKey = `${mode}:${query.sport ?? 'all'}:${this.config.polymarket.allowNegativeRisk}`;
    const cached = this.discoveryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const inFlight = this.inFlightDiscovery.get(cacheKey);
    if (inFlight) return await inFlight;

    const request = this.discoverAndFilterFresh(query, mode)
      .finally(() => this.inFlightDiscovery.delete(cacheKey));
    this.inFlightDiscovery.set(cacheKey, request);
    return await request;
  }

  private async discoverAndFilterFresh(query: { mode?: DiscoveryMode; sport?: Sport }, mode: DiscoveryMode) {
    const candidates = await this.adapter.discover(query);
    const result = this.filter.filter(candidates, {
      now: mode === 'fixture' ? fixtureNow : new Date(),
      allowNegativeRisk: this.config.polymarket.allowNegativeRisk,
    });
    await this.repository.saveCandidates(candidates);
    await this.repository.saveAcceptedTemplates(result.accepted);
    await this.repository.saveRejectedCandidates(result.rejected);
    const cacheKey = `${mode}:${query.sport ?? 'all'}:${this.config.polymarket.allowNegativeRisk}`;
    this.discoveryCache.set(cacheKey, { expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS, result });
    return result;
  }

  parseTemplateQuery(query: TemplateQuery): TemplateQuery {
    const mode = query.mode;
    if (mode && mode !== 'fixture' && mode !== 'live') {
      throw new Error('mode must be fixture or live');
    }

    const sport = query.sport;
    if (sport && !(sports as readonly string[]).includes(sport)) {
      throw new Error('sport must be one of football, tennis, ufc, f1');
    }

    return { mode, sport };
  }

  resolveMode(query: { mode?: DiscoveryMode }): DiscoveryMode {
    return query.mode ?? this.config.polymarket.discoveryMode;
  }
}
