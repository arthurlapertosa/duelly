import { randomUUID } from 'node:crypto';
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
import {
  normalizeSearchText,
  TemplateRepository,
  type CurrentTemplateListResult,
  type TemplatePageCursor,
} from '../../modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../../modules/templates/publisher/template-publisher.service.js';
import { ConditionResolutionStatusService } from '../../modules/templates/resolution/condition-resolution-status.service.js';
import { httpError } from '../../modules/orchestration/services/errors.js';
import {
  ResolutionMirrorService,
  type TemplateCtfMirrorResult,
} from '../../modules/orchestration/services/resolution-mirror.service.js';
import type { TemplateCtfSyncStatus } from '../../modules/templates/persistence/entities/index.js';

export interface TemplateControllerOptions {
  config: AppConfig;
  dataSource?: DataSource;
  logger?: TemplatePolicyLogger;
}

export interface TemplateQuery {
  mode?: DiscoveryMode;
  sport?: Sport;
  q?: string;
  limit?: number | string;
  cursor?: string;
}

export interface ParsedTemplateQuery {
  mode?: DiscoveryMode;
  sport?: Sport;
  q?: string;
  limit: number;
  cursor?: TemplatePageCursor;
}

export interface TemplateListResponse extends Omit<CurrentTemplateListResult, 'nextCursor'> {
  mode: DiscoveryMode;
  pageCount: number;
  nextCursor: string | null;
}

export interface PublishBody {
  templateId?: string;
  publishedBy?: string;
}

export interface TemplatePolicyLogger {
  info(input: unknown, message?: string): void;
  warn?(input: unknown, message?: string): void;
  error?(input: unknown, message?: string): void;
}

export interface TemplateCtfSyncRunInput {
  conditionId?: string;
  templateId?: string;
  limit?: number;
}

export interface TemplateCtfSyncRunResult {
  enabled: boolean;
  checked: number;
  results: TemplateCtfSyncResult[];
}

export interface TemplateCtfSyncResult {
  status: TemplateCtfSyncStatus;
  templateHash: string;
  templateId: string;
  conditionId: string;
  sourceDenominator: string | null;
  forkDenominator: string | null;
  prepareTransactionHash: string | null;
  mirrorTransactionHash: string | null;
  blockNumber: string | null;
  error: string | null;
}

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');
const DISCOVERY_CACHE_TTL_MS = 60_000;
const DEFAULT_TEMPLATE_PAGE_SIZE = 25;
const MAX_TEMPLATE_PAGE_SIZE = 100;

export class TemplateControllerContext {
  readonly adapter: DiscoveryAdapter;
  readonly filter = new TemplateFilterService();
  readonly repository: TemplateRepository;
  readonly publisher = new TemplatePublisherService();
  readonly conditionResolution: ConditionResolutionStatusService;
  readonly config: AppConfig;
  private readonly chain: ChainService;
  private readonly ctfMirror: ResolutionMirrorService;
  private readonly logger?: TemplatePolicyLogger;
  private readonly discoveryCache = new Map<string, { expiresAt: number; result: TemplateFilterResult }>();
  private readonly inFlightDiscovery = new Map<string, Promise<TemplateFilterResult>>();

  constructor(options: TemplateControllerOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.adapter = new DiscoveryAdapter(options.config);
    this.repository = new TemplateRepository(options.dataSource);
    this.chain = new ChainService(options.config);
    this.ctfMirror = new ResolutionMirrorService(
      options.config,
      this.chain,
      (templateHash) => this.findAcceptedTemplate(templateHash),
      options.logger,
    );
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

  async findTemplateForDisplay(id: string) {
    const stored = await this.repository.findAcceptedTemplateByIdOrHash(id);
    if (stored) return stored;
    if (this.repository.enabled) return undefined;
    const result = await this.discoverAndFilter({});
    const normalized = id.toLowerCase();
    return result.accepted.find((template) => (
      template.templateId === id
      || template.templateHash.toLowerCase() === normalized
    ));
  }

  async findTemplateForSelection(id: string, query: { mode?: DiscoveryMode; sport?: Sport }) {
    const mode = this.resolveMode(query);
    if (this.shouldUseCurrentSnapshot(mode)) {
      await this.ensureCurrentSnapshot(mode);
      return await this.repository.findCurrentAcceptedTemplateByIdOrHash(id, mode);
    }

    const stored = await this.repository.findAcceptedTemplateByIdOrHash(id);
    if (stored && mode === 'live') return stored;
    const result = await this.discoverAndFilter(query);
    const normalized = id.toLowerCase();
    return result.accepted.find((template) => (
      template.templateId === id
      || template.templateHash.toLowerCase() === normalized
    ));
  }

  async isTemplateKnownResolved(template: CanonicalSportsTemplate): Promise<boolean> {
    const status = (await this.conditionResolution.cachedStatuses([template.conditionId]))
      .get(template.conditionId.toLowerCase());
    return status?.status === 'resolved';
  }

  async isTemplateResolved(template: CanonicalSportsTemplate, options: { force?: boolean } = {}): Promise<boolean> {
    const status = options.force
      ? await this.conditionResolution.refresh(template.conditionId, { force: true })
      : (await this.conditionResolution.cachedStatuses([template.conditionId])).get(template.conditionId.toLowerCase());
    if (!status || status.status !== 'resolved') return false;
    this.discoveryCache.clear();
    return true;
  }

  async assertTemplateAvailableForInvite(template: CanonicalSportsTemplate): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds + this.config.polymarket.minBettingCloseBufferSeconds >= template.bettingCloseAt) {
      throw httpError(410, 'TEMPLATE_CLOSED');
    }
    if (await this.isTemplateResolved(template, { force: true })) {
      throw httpError(410, 'CONDITION_RESOLVED');
    }
  }

  async listAcceptedTemplates(query: ParsedTemplateQuery): Promise<TemplateListResponse> {
    const mode = this.resolveMode(query);
    const terms = parseSearchTerms(query.q ?? '');
    if (this.shouldUseCurrentSnapshot(mode)) {
      await this.ensureCurrentSnapshot(mode);
      const result = await this.repository.listCurrentAcceptedTemplates({
        mode,
        sport: query.sport,
        searchTerms: terms,
        limit: query.limit,
        cursor: query.cursor,
        staleAfterMs: this.config.polymarket.templateDiscoveryRefreshIntervalMs,
      });
      return {
        ...result,
        mode,
        pageCount: result.templates.length,
        nextCursor: encodeCursor(result.nextCursor),
      };
    }

    const result = await this.discoverAndFilter(query);
    const filtered = applyTemplateFilters(result.accepted, query.sport, terms);
    const page = paginateTemplates(filtered, query.limit, query.cursor);
    return {
      mode,
      count: filtered.length,
      templates: page.templates,
      pageCount: page.templates.length,
      nextCursor: encodeCursor(page.nextCursor),
      refreshedAt: new Date(),
      stale: false,
    };
  }

  async refreshCurrentDiscoverySnapshot(query: { mode?: DiscoveryMode; sport?: Sport; persistSnapshots?: boolean } = {}) {
    const mode = this.resolveMode(query);
    const startedAt = new Date();
    const candidates = await this.adapter.discover({ mode, sport: query.sport });
    const result = await this.filterDiscoveryResult(candidates, mode);
    const discoveryRunId = `discovery-${randomUUID()}`;
    await this.repository.saveAcceptedTemplates(result.accepted, discoveryRunId);
    if (query.persistSnapshots) {
      await this.repository.saveCandidates(candidates, discoveryRunId);
      await this.repository.saveRejectedCandidates(result.rejected);
    }
    await this.repository.recordDiscoveryRun({
      id: discoveryRunId,
      mode,
      sport: query.sport ?? null,
      provider: 'polymarket',
      status: 'succeeded',
      gammaBaseUrl: this.config.polymarket.gammaBaseUrl,
      startedAt,
      finishedAt: new Date(),
    });
    const cacheKey = this.cacheKey(mode, query);
    this.discoveryCache.set(cacheKey, { expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS, result });
    return {
      discoveryRunId,
      mode,
      candidates: candidates.length,
      accepted: result.accepted.length,
      rejected: result.rejected.length,
    };
  }

  async syncCurrentTemplateCtf(input: TemplateCtfSyncRunInput = {}): Promise<TemplateCtfSyncRunResult> {
    if (!this.config.templateCtfSync.enabled || !this.shouldUseCurrentSnapshot('live')) {
      return { enabled: false, checked: 0, results: [] };
    }
    await this.ensureCurrentSnapshot('live');
    const templates = await this.repository.findTemplatesForCtfSync({
      mode: 'live',
      conditionId: input.conditionId,
      templateId: input.templateId,
      limit: normalizeSyncLimit(input.limit, this.config.templateCtfSync.batchSize),
    });
    const results = await this.syncTemplateCtfBatch(templates);
    return { enabled: true, checked: results.length, results };
  }

  private async discoverAndFilterFresh(query: { mode?: DiscoveryMode; sport?: Sport }, mode: DiscoveryMode) {
    const candidates = await this.adapter.discover(query);
    const result = await this.filterDiscoveryResult(candidates, mode);
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

  private async filterDiscoveryResult(candidates: NormalizedMarketCandidate[], mode: DiscoveryMode) {
    const filtered = this.filter.filter(candidates, {
      now: mode === 'fixture' ? fixtureNow : new Date(),
      allowNegativeRisk: this.config.polymarket.allowNegativeRisk,
      minBettingCloseBufferSeconds: this.config.polymarket.minBettingCloseBufferSeconds,
    });
    return mode === 'live'
      ? await this.hideKnownResolvedTemplates(filtered, candidates)
      : filtered;
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

  parseTemplateListQuery(query: TemplateQuery): ParsedTemplateQuery {
    const parsed = this.parseTemplateQuery(query);
    const limit = parseLimit(query.limit);
    return {
      ...parsed,
      q: typeof query.q === 'string' ? query.q.trim() : undefined,
      limit,
      cursor: decodeCursor(query.cursor),
    };
  }

  resolveMode(query: { mode?: DiscoveryMode }): DiscoveryMode {
    return query.mode ?? this.config.polymarket.discoveryMode;
  }

  private shouldUseCurrentSnapshot(mode: DiscoveryMode): boolean {
    return mode === 'live' && this.config.polymarket.liveDiscoveryEnabled && this.repository.enabled;
  }

  private async ensureCurrentSnapshot(mode: DiscoveryMode): Promise<void> {
    if (!this.shouldUseCurrentSnapshot(mode)) return;
    const run = await this.repository.findLatestSuccessfulDiscoveryRun(mode);
    if (run) return;
    await this.refreshCurrentDiscoverySnapshot({ mode, persistSnapshots: false });
  }

  private async syncTemplateCtfBatch(templates: CanonicalSportsTemplate[]): Promise<TemplateCtfSyncResult[]> {
    const uniqueTemplates = uniqueTemplatesByConditionId(templates);
    const results: TemplateCtfSyncResult[] = [];
    const concurrency = Math.max(1, this.config.templateCtfSync.concurrency);
    let cursor = 0;

    const workers = Array.from({ length: Math.min(concurrency, uniqueTemplates.length) }, async () => {
      while (cursor < uniqueTemplates.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await this.syncOneTemplateCtf(uniqueTemplates[index]);
      }
    });

    await Promise.all(workers);
    return results;
  }

  private async syncOneTemplateCtf(template: CanonicalSportsTemplate): Promise<TemplateCtfSyncResult> {
    try {
      const mirror = await this.ctfMirror.syncTemplate(template);
      const result = syncResultFromMirror(mirror);
      await this.saveTemplateCtfSyncStatus(result);
      this.logger?.info({
        status: result.status,
        templateId: result.templateId,
        templateHash: result.templateHash,
        conditionId: result.conditionId,
        sourceDenominator: result.sourceDenominator,
        forkDenominator: result.forkDenominator,
        prepareTransactionHash: result.prepareTransactionHash,
        mirrorTransactionHash: result.mirrorTransactionHash,
      }, `template CTF sync ${result.status}`);
      return result;
    } catch (error) {
      const result: TemplateCtfSyncResult = {
        status: 'failed',
        templateHash: template.templateHash,
        templateId: template.templateId,
        conditionId: template.conditionId,
        sourceDenominator: null,
        forkDenominator: null,
        prepareTransactionHash: null,
        mirrorTransactionHash: null,
        blockNumber: null,
        error: error instanceof Error ? error.message : String(error),
      };
      await this.saveTemplateCtfSyncStatus(result);
      this.logger?.warn?.({
        status: result.status,
        templateId: result.templateId,
        templateHash: result.templateHash,
        conditionId: result.conditionId,
        error: result.error,
      }, 'template CTF sync failed');
      return result;
    }
  }

  private async saveTemplateCtfSyncStatus(result: TemplateCtfSyncResult): Promise<void> {
    const now = new Date();
    await this.repository.saveTemplateCtfSyncStatus({
      conditionId: result.conditionId,
      templateHash: result.templateHash,
      templateId: result.templateId,
      status: result.status,
      sourceDenominator: result.sourceDenominator,
      forkDenominator: result.forkDenominator,
      prepareTransactionHash: result.prepareTransactionHash,
      mirrorTransactionHash: result.mirrorTransactionHash,
      blockNumber: result.blockNumber,
      error: result.error,
      checkedAt: now,
      updatedAt: now,
    });
  }
}

function parseLimit(value: number | string | undefined): number {
  const parsed = value === undefined ? DEFAULT_TEMPLATE_PAGE_SIZE : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TEMPLATE_PAGE_SIZE;
  return Math.min(parsed, MAX_TEMPLATE_PAGE_SIZE);
}

function parseSearchTerms(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

function applyTemplateFilters(
  templates: CanonicalSportsTemplate[],
  sport: Sport | undefined,
  terms: string[],
): CanonicalSportsTemplate[] {
  return templates.filter((template) => {
    if (sport && template.sport !== sport) return false;
    if (terms.length === 0) return true;
    const searchable = normalizeSearchText([
      template.display.question,
      template.display.ptBR?.question,
      template.display.ptBR?.rulesSummary,
      ...(template.display.ptBR?.outcomes ?? []),
      template.sport,
      template.provider,
      'Polymarket',
      template.outcomeA.label,
      template.outcomeB.label,
    ].filter(Boolean).join(' '));
    return terms.every((term) => searchable.includes(term));
  });
}

function paginateTemplates(
  templates: CanonicalSportsTemplate[],
  limit: number,
  cursor: TemplatePageCursor | undefined,
): { templates: CanonicalSportsTemplate[]; nextCursor: TemplatePageCursor | null } {
  const sorted = [...templates].sort((left, right) => (
    left.eventStartAt - right.eventStartAt
    || left.templateId.localeCompare(right.templateId)
  ));
  const startIndex = cursor
    ? sorted.findIndex((template) => (
      template.eventStartAt > cursor.eventStartAt
      || (template.eventStartAt === cursor.eventStartAt && template.templateId > cursor.templateId)
    ))
    : 0;
  const page = sorted.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit + 1);
  const visible = page.length > limit ? page.slice(0, limit) : page;
  const last = visible.at(-1);
  return {
    templates: visible,
    nextCursor: page.length > limit && last ? { eventStartAt: last.eventStartAt, templateId: last.templateId } : null,
  };
}

function encodeCursor(cursor: TemplatePageCursor | null): string | null {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function normalizeSyncLimit(limit: number | undefined, fallback: number): number {
  if (limit === undefined) return fallback;
  if (!Number.isFinite(limit) || limit <= 0) return fallback;
  return Math.min(Math.floor(limit), 500);
}

function uniqueTemplatesByConditionId(templates: CanonicalSportsTemplate[]): CanonicalSportsTemplate[] {
  const seen = new Set<string>();
  const result: CanonicalSportsTemplate[] = [];
  for (const template of templates) {
    const conditionId = template.conditionId.toLowerCase();
    if (seen.has(conditionId)) continue;
    seen.add(conditionId);
    result.push(template);
  }
  return result;
}

function syncResultFromMirror(result: TemplateCtfMirrorResult): TemplateCtfSyncResult {
  return {
    status: result.status as TemplateCtfSyncStatus,
    templateHash: result.templateHash,
    templateId: result.templateId,
    conditionId: result.conditionId,
    sourceDenominator: result.sourceDenominator,
    forkDenominator: result.forkDenominator,
    prepareTransactionHash: result.prepareTransactionHash,
    mirrorTransactionHash: result.transactionHash,
    blockNumber: result.blockNumber,
    error: result.error,
  };
}

function decodeCursor(value: string | undefined): TemplatePageCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<TemplatePageCursor>;
    if (typeof parsed.eventStartAt !== 'number' || typeof parsed.templateId !== 'string') return undefined;
    return { eventStartAt: parsed.eventStartAt, templateId: parsed.templateId };
  } catch {
    return undefined;
  }
}
