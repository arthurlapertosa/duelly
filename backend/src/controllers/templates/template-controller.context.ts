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
  logger?: TemplatePolicyLogger;
}

export interface TemplateQuery {
  mode?: DiscoveryMode;
  sport?: Sport;
}

export interface PublishBody {
  templateId?: string;
  publishedBy?: string;
}

export interface TemplatePolicyLogger {
  info(input: unknown, message?: string): void;
}

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');
const DISCOVERY_CACHE_TTL_MS = 60_000;

export class TemplateControllerContext {
  readonly adapter: DiscoveryAdapter;
  readonly filter = new TemplateFilterService();
  readonly repository: TemplateRepository;
  readonly publisher = new TemplatePublisherService();
  readonly config: AppConfig;
  private readonly logger?: TemplatePolicyLogger;
  private readonly discoveryCache = new Map<string, { expiresAt: number; result: TemplateFilterResult }>();
  private readonly inFlightDiscovery = new Map<string, Promise<TemplateFilterResult>>();

  constructor(options: TemplateControllerOptions) {
    this.config = options.config;
    this.logger = options.logger;
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
    const cacheKey = this.cacheKey(mode, query);
    const cached = this.discoveryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const inFlight = this.inFlightDiscovery.get(cacheKey);
    if (inFlight) return await inFlight;

    const request = this.discoverAndFilterFresh(query, mode)
      .finally(() => this.inFlightDiscovery.delete(cacheKey));
    this.inFlightDiscovery.set(cacheKey, request);
    return await request;
  }

  async findAcceptedTemplate(templateHash: string) {
    const stored = await this.repository.findAcceptedTemplate(templateHash);
    if (stored) return stored;
    const result = await this.discoverAndFilter({});
    return result.accepted.find((template) => template.templateHash.toLowerCase() === templateHash.toLowerCase());
  }

  private async discoverAndFilterFresh(query: { mode?: DiscoveryMode; sport?: Sport }, mode: DiscoveryMode) {
    const candidates = await this.adapter.discover(query);
    const result = this.filter.filter(candidates, {
      now: mode === 'fixture' ? fixtureNow : new Date(),
      allowNegativeRisk: this.config.polymarket.allowNegativeRisk,
      minBettingCloseBufferSeconds: this.config.polymarket.minBettingCloseBufferSeconds,
    });
    this.logger?.info({
      mode,
      sport: query.sport ?? 'all',
      candidates: candidates.length,
      accepted: result.accepted.length,
      rejected: result.rejected.length,
      allowNegativeRisk: this.config.polymarket.allowNegativeRisk,
      minBettingCloseBufferSeconds: this.config.polymarket.minBettingCloseBufferSeconds,
    }, 'template discovery filter applied');
    await this.repository.saveCandidates(candidates);
    await this.repository.saveAcceptedTemplates(result.accepted);
    await this.repository.saveRejectedCandidates(result.rejected);
    const cacheKey = this.cacheKey(mode, query);
    this.discoveryCache.set(cacheKey, { expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS, result });
    return result;
  }

  private cacheKey(mode: DiscoveryMode, query: { sport?: Sport }): string {
    return [
      mode,
      query.sport ?? 'all',
      this.config.polymarket.allowNegativeRisk,
      this.config.polymarket.minBettingCloseBufferSeconds,
    ].join(':');
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
