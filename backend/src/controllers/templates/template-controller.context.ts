import type { DataSource } from 'typeorm';
import type { AppConfig } from '../../config/env.js';
import { ChainService } from '../../modules/orchestration/chain.js';
import {
  sports,
  type CanonicalSportsTemplate,
  type DiscoveryMode,
  type NormalizedMarketCandidate,
  type Sport,
  type TemplateFilterResult,
} from '../../modules/templates/domain/types.js';
import { DiscoveryAdapter } from '../../modules/templates/discovery/discovery-adapter.js';
import { TemplateFilterService } from '../../modules/templates/filtering/template-filter.service.js';
import { TemplateRepository } from '../../modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../../modules/templates/publisher/template-publisher.service.js';
import { ConditionResolutionStatusService } from '../../modules/templates/resolution/condition-resolution-status.service.js';

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
  readonly conditionResolution: ConditionResolutionStatusService;
  readonly config: AppConfig;
  private readonly chain: ChainService;
  private readonly logger?: TemplatePolicyLogger;
  private readonly discoveryCache = new Map<string, { expiresAt: number; result: TemplateFilterResult }>();
  private readonly inFlightDiscovery = new Map<string, Promise<TemplateFilterResult>>();

  constructor(options: TemplateControllerOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.adapter = new DiscoveryAdapter(options.config);
    this.repository = new TemplateRepository(options.dataSource);
    this.chain = new ChainService(options.config);
    this.conditionResolution = new ConditionResolutionStatusService(
      options.config,
      this.repository,
      this.chain,
      options.logger,
    );
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

  async findTemplateForSelection(id: string, query: { mode?: DiscoveryMode; sport?: Sport }) {
    return await this.findFreshAcceptedTemplateByIdOrHash(id, query);
  }

  async isTemplateResolved(template: CanonicalSportsTemplate): Promise<boolean> {
    const status = await this.conditionResolution.refresh(template.conditionId, { force: true });
    if (status.status !== 'resolved') return false;
    this.discoveryCache.clear();
    return true;
  }

  private async discoverAndFilterFresh(query: { mode?: DiscoveryMode; sport?: Sport }, mode: DiscoveryMode) {
    const candidates = await this.adapter.discover(query);
    const filtered = this.filter.filter(candidates, {
      now: mode === 'fixture' ? fixtureNow : new Date(),
      allowNegativeRisk: this.config.polymarket.allowNegativeRisk,
      minBettingCloseBufferSeconds: this.config.polymarket.minBettingCloseBufferSeconds,
    });
    const result = mode === 'live'
      ? await this.hideKnownResolvedTemplates(filtered, candidates)
      : filtered;
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

  private async findFreshAcceptedTemplateByIdOrHash(id: string, query: { mode?: DiscoveryMode; sport?: Sport }) {
    const mode = this.resolveMode(query);
    const candidates = await this.adapter.discover(query);
    const result = this.filter.filter(candidates, {
      now: mode === 'fixture' ? fixtureNow : new Date(),
      allowNegativeRisk: this.config.polymarket.allowNegativeRisk,
      minBettingCloseBufferSeconds: this.config.polymarket.minBettingCloseBufferSeconds,
    });
    const normalized = id.toLowerCase();
    return result.accepted.find((template) => (
      template.templateId === id
      || template.templateHash.toLowerCase() === normalized
    ));
  }

  private async hideKnownResolvedTemplates(
    result: TemplateFilterResult,
    candidates: NormalizedMarketCandidate[],
  ): Promise<TemplateFilterResult> {
    if (result.accepted.length === 0) return result;
    const statuses = await this.conditionResolution.cachedStatuses(
      result.accepted.map((template) => template.conditionId),
    );
    const candidatesByProviderMarketId = new Map(candidates.map((candidate) => [candidate.providerMarketId, candidate]));
    const accepted: TemplateFilterResult['accepted'] = [];
    const rejected = [...result.rejected];
    const refreshConditionIds: string[] = [];

    for (const template of result.accepted) {
      const status = statuses.get(template.conditionId.toLowerCase());
      if (status?.status === 'resolved') {
        const candidate = candidatesByProviderMarketId.get(template.providerMarketId);
        if (candidate) rejected.push({ candidate, reasons: ['CONDITION_RESOLVED'] });
        continue;
      }
      accepted.push(template);
      if (!status || status.needsRefresh) refreshConditionIds.push(template.conditionId);
    }

    this.refreshAcceptedTemplateConditions(refreshConditionIds);
    return { accepted, rejected };
  }

  private refreshAcceptedTemplateConditions(conditionIds: string[]): void {
    if (conditionIds.length === 0) return;
    void this.conditionResolution.refreshMany(conditionIds)
      .then((result) => {
        if (result.resolved.length === 0) return;
        this.discoveryCache.clear();
        this.logger?.info({
          resolvedConditions: result.resolved.length,
        }, 'template discovery cache invalidated after condition resolution refresh');
      })
      .catch((error) => {
        this.logger?.info({
          error: error instanceof Error ? error.message : String(error),
        }, 'template condition resolution refresh failed');
      });
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
