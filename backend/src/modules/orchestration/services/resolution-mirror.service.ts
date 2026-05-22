import type { AppConfig } from '../../../config/env.js';
import type { CanonicalSportsTemplate } from '../../templates/domain/types.js';
import type { ChainService } from '../chain.js';
import type { IndexedBet } from '../domain.js';
import type { Address, Hex } from 'viem';

export type ResolutionMirrorStatus =
  | 'disabled'
  | 'missing-source-rpc'
  | 'missing-oracle'
  | 'non-local-fork-rpc'
  | 'invalid-chain-id'
  | 'missing-template'
  | 'invalid-template'
  | 'source-unresolved'
  | 'already-resolved'
  | 'mirrored';

export interface ResolutionMirrorResult {
  status: ResolutionMirrorStatus;
  betId: string;
  conditionId: Hex;
  sourceDenominator: string | null;
  transactionHash: Hex | null;
  prepareTransactionHash: Hex | null;
  blockNumber: string | null;
}

interface MirrorLogger {
  info(input: unknown, message?: string): void;
  warn(input: unknown, message?: string): void;
}

export class ResolutionMirrorService {
  constructor(
    private readonly config: AppConfig,
    private readonly chain: ChainService,
    private readonly resolveTemplate: (templateHash: Hex) => Promise<CanonicalSportsTemplate | undefined>,
    private readonly logger?: MirrorLogger,
  ) {}

  async syncBet(bet: IndexedBet): Promise<ResolutionMirrorResult> {
    if (!this.config.polymarketResolutionMirror.enabled) {
      return this.result('disabled', bet);
    }
    if (!this.config.polymarketResolutionMirror.sourceRpcUrl) {
      return this.result('missing-source-rpc', bet);
    }
    if (!this.config.polymarketResolutionMirror.oracleAddress) {
      return this.result('missing-oracle', bet);
    }
    if (!this.isAllowedForkRpc()) {
      this.logger?.warn(
        { rpcUrl: this.config.chain.rpcUrl },
        'resolution mirror refused non-local fork rpc',
      );
      return this.result('non-local-fork-rpc', bet);
    }

    const template = await this.resolveTemplate(bet.templateHash);
    if (!template) return this.result('missing-template', bet);
    if (template.conditionId.toLowerCase() !== bet.conditionId.toLowerCase() || !isBytes32(template.questionId)) {
      return this.result('invalid-template', bet);
    }

    const [forkChainId, sourceChainId] = await Promise.all([
      this.chain.readChainId(),
      this.chain.readChainId({ rpcUrl: this.config.polymarketResolutionMirror.sourceRpcUrl }),
    ]);
    if (forkChainId !== 137 || sourceChainId !== 137) {
      this.logger?.warn(
        { forkChainId, sourceChainId },
        'resolution mirror refused non-Polygon chain id',
      );
      return this.result('invalid-chain-id', bet);
    }

    const sourceState = await this.chain.readCtfPayoutState(bet.conditionId, {
      rpcUrl: this.config.polymarketResolutionMirror.sourceRpcUrl,
    });
    if (sourceState.denominator === 0n) {
      return this.result('source-unresolved', bet, sourceState.denominator);
    }

    const outcomeSlotCount = sourceState.outcomeSlotCount || this.config.polymarketResolutionMirror.outcomeSlotCount;
    if (
      outcomeSlotCount !== this.config.polymarketResolutionMirror.outcomeSlotCount
      || sourceState.numerators.length !== outcomeSlotCount
    ) {
      return this.result('invalid-template', bet, sourceState.denominator);
    }

    const mirrored = await this.chain.mirrorCtfPayout({
      oracleAddress: this.config.polymarketResolutionMirror.oracleAddress as Address,
      questionId: template.questionId as Hex,
      conditionId: bet.conditionId,
      outcomeSlotCount,
      numerators: sourceState.numerators,
    });
    this.logger?.info({
      betId: bet.betId,
      conditionId: bet.conditionId,
      mirrorStatus: mirrored.status,
      transactionHash: mirrored.transactionHash,
    }, 'resolution mirror synced CTF payout');
    return this.result(
      mirrored.status === 'mirrored' ? 'mirrored' : 'already-resolved',
      bet,
      sourceState.denominator,
      mirrored.transactionHash,
      mirrored.prepareTransactionHash,
      mirrored.blockNumber,
    );
  }

  private result(
    status: ResolutionMirrorStatus,
    bet: IndexedBet,
    sourceDenominator: bigint | null = null,
    transactionHash: Hex | null = null,
    prepareTransactionHash: Hex | null = null,
    blockNumber: string | null = null,
  ): ResolutionMirrorResult {
    return {
      status,
      betId: bet.betId,
      conditionId: bet.conditionId,
      sourceDenominator: sourceDenominator?.toString() ?? null,
      transactionHash,
      prepareTransactionHash,
      blockNumber,
    };
  }

  private isAllowedForkRpc(): boolean {
    if (this.config.polymarketResolutionMirror.allowNonLocalForkRpc) return true;
    const rpcUrl = this.config.chain.rpcUrl;
    if (!rpcUrl) return false;
    try {
      const parsed = new URL(rpcUrl);
      return ['127.0.0.1', 'localhost', '0.0.0.0', '[::1]'].includes(parsed.hostname);
    } catch {
      return false;
    }
  }
}

function isBytes32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
