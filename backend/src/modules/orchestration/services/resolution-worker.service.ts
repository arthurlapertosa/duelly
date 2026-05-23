import type { AppConfig } from '../../../config/env.js';
import type { ChainService } from '../chain.js';
import type { IndexedBet } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import type { IndexerService } from './indexer.service.js';
import type { ResolutionMirrorService } from './resolution-mirror.service.js';
import type { ResolutionService } from './resolution.service.js';

export interface ResolutionWorkerTickResult {
  reindex: unknown;
  checked: number;
  pending: number;
  mirrored: number;
  resolved: number;
  expired: number;
  skippedRetry: number;
  failed: number;
}

interface WorkerLogger {
  info(input: unknown, message?: string): void;
  warn(input: unknown, message?: string): void;
  error(input: unknown, message?: string): void;
}

export class ResolutionWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly config: AppConfig,
    private readonly repository: OrchestrationRepository,
    private readonly chain: ChainService,
    private readonly indexer: IndexerService,
    private readonly resolution: ResolutionService,
    private readonly mirror?: ResolutionMirrorService,
    private readonly logger?: WorkerLogger,
  ) {}

  start(): boolean {
    if (!this.config.resolutionWorker.enabled || this.timer) return false;
    this.timer = setInterval(() => {
      void this.tick().catch((error) => {
        this.logger?.error({ error }, 'resolution worker tick failed');
      });
    }, this.config.resolutionWorker.intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => {
      this.logger?.error({ error }, 'resolution worker initial tick failed');
    });
    this.logger?.info({
      intervalMs: this.config.resolutionWorker.intervalMs,
      batchSize: this.config.resolutionWorker.batchSize,
    }, 'resolution worker started');
    return true;
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    this.logger?.info({}, 'resolution worker stopped');
  }

  async tick(now = new Date()): Promise<ResolutionWorkerTickResult> {
    if (this.running) {
      return {
        reindex: null,
        checked: 0,
        pending: 0,
        mirrored: 0,
        resolved: 0,
        expired: 0,
        skippedRetry: 0,
        failed: 0,
      };
    }

    this.running = true;
    const result: ResolutionWorkerTickResult = {
      reindex: null,
      checked: 0,
      pending: 0,
      mirrored: 0,
      resolved: 0,
      expired: 0,
      skippedRetry: 0,
      failed: 0,
    };

    try {
      result.reindex = await this.indexer.reindex();
      const deploymentKey = this.chain.deploymentKey();
      const bets = await this.repository.findIndexedBetsByStatus('Funded', this.config.resolutionWorker.batchSize, deploymentKey);
      for (const bet of bets) {
        result.checked += 1;
        if (!await this.shouldRetry(bet.betId, deploymentKey, now)) {
          result.skippedRetry += 1;
          continue;
        }
        await this.processBet(bet, now, result);
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  private async processBet(bet: IndexedBet, now: Date, result: ResolutionWorkerTickResult): Promise<void> {
    try {
      const mirrorResult = await this.mirror?.syncBet(bet);
      if (mirrorResult?.status === 'mirrored') {
        result.mirrored += 1;
      }
      const denominator = await this.chain.readPayoutDenominator(bet.conditionId);
      if (denominator > 0n) {
        const attempt = await this.resolution.trigger(bet.betId);
        if (attempt.status === 'resolved') {
          result.resolved += 1;
          await this.indexer.reindex();
        } else {
          result.failed += 1;
        }
        return;
      }

      if (mirrorResult && mirrorSawResolvedSource(mirrorResult.sourceDenominator)) {
        await this.resolution.recordPending(bet.betId, `PolymarketResolutionMirror:${mirrorResult.status}`);
        result.pending += 1;
        this.logger?.warn({
          betId: bet.betId,
          conditionId: bet.conditionId,
          mirrorStatus: mirrorResult.status,
          sourceDenominator: mirrorResult.sourceDenominator,
        }, 'resolution worker deferred expiry after resolved source mirror did not update fork CTF');
        return;
      }

      const escrowBet = await this.chain.readEscrowBet(bet.betId);
      const nowSeconds = BigInt(Math.floor(now.getTime() / 1000));
      if (nowSeconds > escrowBet.resolutionDeadline) {
        const attempt = await this.resolution.expire(bet.betId);
        if (attempt.status === 'expired') {
          result.expired += 1;
          await this.indexer.reindex();
        } else {
          result.failed += 1;
        }
        return;
      }

      await this.resolution.recordPending(bet.betId);
      result.pending += 1;
    } catch (error) {
      result.failed += 1;
      this.logger?.warn({ betId: bet.betId, error }, 'resolution worker bet failed');
    }
  }

  private async shouldRetry(betId: string, deploymentKey: string, now: Date): Promise<boolean> {
    const attempt = await this.repository.findLatestResolutionAttemptForBet(betId, deploymentKey);
    if (!attempt) return true;
    if (attempt.status === 'resolved' || attempt.status === 'expired') return false;
    const retryAfterMs = this.config.resolutionWorker.pendingRetrySeconds * 1000;
    return now.getTime() - attempt.createdAt.getTime() >= retryAfterMs;
  }
}

function mirrorSawResolvedSource(sourceDenominator: string | null): boolean {
  if (!sourceDenominator) return false;
  try {
    return BigInt(sourceDenominator) > 0n;
  } catch {
    return false;
  }
}
