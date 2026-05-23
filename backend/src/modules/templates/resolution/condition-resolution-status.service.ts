import type { Hex } from 'viem';
import type { AppConfig } from '../../../config/env.js';
import type { ChainService } from '../../orchestration/chain.js';
import type { TemplateRepository } from '../persistence/template-repository.js';
import {
  ConditionResolutionStatusEntity,
  type PersistedConditionResolutionStatus,
} from '../persistence/entities/index.js';

export type ConditionResolutionState = 'unknown' | 'unresolved' | 'resolved';

export interface ConditionResolutionStatus {
  conditionId: string;
  status: ConditionResolutionState;
  checkedAt: Date | null;
  expiresAt: Date | null;
  payoutDenominator: bigint | null;
  source: string | null;
  error: string | null;
  stale: boolean;
  needsRefresh: boolean;
}

export interface ConditionResolutionRefreshResult {
  statuses: ConditionResolutionStatus[];
  resolved: string[];
}

interface ResolutionLogger {
  info(input: unknown, message?: string): void;
}

export class ConditionResolutionStatusService {
  private readonly memory = new Map<string, ConditionResolutionStatus>();

  constructor(
    private readonly config: AppConfig,
    private readonly repository: TemplateRepository,
    private readonly chain: ChainService,
    private readonly logger?: ResolutionLogger,
  ) {}

  async cachedStatuses(conditionIds: string[], now = new Date()): Promise<Map<string, ConditionResolutionStatus>> {
    const result = new Map<string, ConditionResolutionStatus>();
    const missing: string[] = [];

    for (const conditionId of uniqueConditionIds(conditionIds)) {
      const cached = this.memory.get(conditionId);
      if (cached) {
        const status = this.withFreshness(cached, now);
        this.memory.set(conditionId, status);
        result.set(conditionId, status);
        continue;
      }
      missing.push(conditionId);
    }

    const records = await this.repository.findConditionResolutionStatuses(missing);
    const found = new Set<string>();
    for (const record of records) {
      const status = this.fromEntity(record, now);
      this.memory.set(status.conditionId, status);
      result.set(status.conditionId, status);
      found.add(status.conditionId);
    }

    for (const conditionId of missing) {
      if (!found.has(conditionId)) result.set(conditionId, unknownStatus(conditionId, true));
    }

    return result;
  }

  async refresh(conditionId: string, options: { force?: boolean; now?: Date } = {}): Promise<ConditionResolutionStatus> {
    const normalized = normalizeConditionId(conditionId);
    const now = options.now ?? new Date();
    if (!options.force) {
      const cached = (await this.cachedStatuses([normalized], now)).get(normalized);
      if (cached && !cached.needsRefresh) return cached;
    }

    const sources = this.rpcSources();
    if (!this.config.chain.polymarketCtfAddress || sources.length === 0) {
      const status = this.statusFromCheck({
        conditionId: normalized,
        status: 'unknown',
        now,
        payoutDenominator: null,
        source: null,
        error: 'CTF address or RPC URL is not configured',
      });
      this.remember(status);
      return status;
    }

    const failures: string[] = [];
    for (const source of sources) {
      try {
        const denominator = await this.chain.readPayoutDenominator(normalized as Hex, { rpcUrl: source.rpcUrl });
        const status = this.statusFromCheck({
          conditionId: normalized,
          status: denominator > 0n ? 'resolved' : 'unresolved',
          now,
          payoutDenominator: denominator,
          source: source.label,
          error: null,
        });
        await this.remember(status);
        return status;
      } catch (error) {
        failures.push(`${source.label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const status = this.statusFromCheck({
      conditionId: normalized,
      status: 'unknown',
      now,
      payoutDenominator: null,
      source: null,
      error: failures.join('; '),
    });
    await this.remember(status);
    this.logger?.info({
      conditionId: normalized,
      error: status.error,
    }, 'condition resolution status check failed');
    return status;
  }

  async refreshMany(conditionIds: string[]): Promise<ConditionResolutionRefreshResult> {
    const ids = uniqueConditionIds(conditionIds);
    const concurrency = Math.max(1, this.config.polymarket.templateResolutionRefreshConcurrency);
    const statuses: ConditionResolutionStatus[] = [];
    let cursor = 0;

    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
      while (cursor < ids.length) {
        const index = cursor;
        cursor += 1;
        statuses[index] = await this.refresh(ids[index]);
      }
    });

    await Promise.all(workers);
    return {
      statuses,
      resolved: statuses.filter((status) => status.status === 'resolved').map((status) => status.conditionId),
    };
  }

  private rpcSources(): Array<{ label: string; rpcUrl: string }> {
    const sources: Array<{ label: string; rpcUrl: string }> = [];
    const sourceRpcUrl = this.config.polymarketResolutionMirror.sourceRpcUrl;
    if (sourceRpcUrl) sources.push({ label: 'source', rpcUrl: sourceRpcUrl });
    const chainRpcUrl = this.config.chain.rpcUrl;
    if (chainRpcUrl && chainRpcUrl !== sourceRpcUrl) sources.push({ label: 'chain', rpcUrl: chainRpcUrl });
    return sources;
  }

  private async remember(status: ConditionResolutionStatus): Promise<void> {
    this.memory.set(status.conditionId, status);
    await this.repository.saveConditionResolutionStatus(toEntity(status));
  }

  private fromEntity(entity: ConditionResolutionStatusEntity, now: Date): ConditionResolutionStatus {
    return this.withFreshness({
      conditionId: normalizeConditionId(entity.conditionId),
      status: entity.status,
      checkedAt: entity.checkedAt,
      expiresAt: entity.expiresAt,
      payoutDenominator: entity.payoutDenominator === null ? null : BigInt(entity.payoutDenominator),
      source: entity.source,
      error: entity.error,
      stale: false,
      needsRefresh: false,
    }, now);
  }

  private withFreshness(status: ConditionResolutionStatus, now: Date): ConditionResolutionStatus {
    if (status.status === 'resolved') {
      return { ...status, stale: false, needsRefresh: false };
    }
    if (status.expiresAt && status.expiresAt.getTime() > now.getTime()) {
      return { ...status, stale: false, needsRefresh: false };
    }
    return { ...status, stale: Boolean(status.checkedAt), needsRefresh: true };
  }

  private statusFromCheck(input: {
    conditionId: string;
    status: PersistedConditionResolutionStatus;
    now: Date;
    payoutDenominator: bigint | null;
    source: string | null;
    error: string | null;
  }): ConditionResolutionStatus {
    const ttlMs = this.config.polymarket.templateResolutionCacheTtlSeconds * 1000;
    return {
      conditionId: input.conditionId,
      status: input.status,
      checkedAt: input.now,
      expiresAt: input.status === 'resolved' ? null : new Date(input.now.getTime() + ttlMs),
      payoutDenominator: input.payoutDenominator,
      source: input.source,
      error: input.error,
      stale: false,
      needsRefresh: false,
    };
  }
}

function toEntity(status: ConditionResolutionStatus): ConditionResolutionStatusEntity {
  const entity = new ConditionResolutionStatusEntity();
  entity.conditionId = status.conditionId;
  entity.status = status.status;
  entity.payoutDenominator = status.payoutDenominator === null ? null : status.payoutDenominator.toString();
  entity.source = status.source;
  entity.checkedAt = status.checkedAt ?? new Date();
  entity.expiresAt = status.expiresAt;
  entity.error = status.error;
  return entity;
}

function unknownStatus(conditionId: string, needsRefresh: boolean): ConditionResolutionStatus {
  return {
    conditionId,
    status: 'unknown',
    checkedAt: null,
    expiresAt: null,
    payoutDenominator: null,
    source: null,
    error: null,
    stale: false,
    needsRefresh,
  };
}

function uniqueConditionIds(conditionIds: string[]): string[] {
  return [...new Set(conditionIds.map(normalizeConditionId).filter(Boolean))];
}

function normalizeConditionId(conditionId: string): string {
  return conditionId.trim().toLowerCase();
}
