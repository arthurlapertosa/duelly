import type { AppConfig } from '../../../config/env.js';
import {
  configuredCtfOracleAddressKeys,
  ctfConditionIdFor,
  isBytes32,
  resolveTemplateCtfOracle,
} from '../../templates/domain/ctf-oracle.js';
import type { CanonicalSportsTemplate } from '../../templates/domain/types.js';
import type { ChainService } from '../chain.js';
import type { IndexedBet } from '../domain.js';
import { getAddress, isAddress, type Address, type Hex } from 'viem';

export type ResolutionMirrorStatus =
  | 'disabled'
  | 'missing-source-rpc'
  | 'missing-oracle'
  | 'non-local-fork-rpc'
  | 'invalid-chain-id'
  | 'missing-template'
  | 'invalid-template'
  | 'source-unresolved'
  | 'prepared'
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

export interface TemplateCtfMirrorResult {
  status: ResolutionMirrorStatus;
  templateHash: Hex;
  templateId: string;
  conditionId: Hex;
  sourceDenominator: string | null;
  forkDenominator: string | null;
  transactionHash: Hex | null;
  prepareTransactionHash: Hex | null;
  blockNumber: string | null;
  error: string | null;
}

interface MirrorLogger {
  info(input: unknown, message?: string): void;
  warn?(input: unknown, message?: string): void;
}

export interface SyncTemplateOptions {
  sourceRpcUrl?: string;
}

interface ResolvedOracleAddress {
  address: Address;
  source: string;
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
      return this.betResult('disabled', bet);
    }
    const template = await this.resolveTemplate(bet.templateHash);
    if (!template) return this.betResult('missing-template', bet);
    if (template.conditionId.toLowerCase() !== bet.conditionId.toLowerCase()) {
      return this.betResult('invalid-template', bet);
    }

    const result = await this.syncTemplate(template);
    return {
      status: result.status,
      betId: bet.betId,
      conditionId: bet.conditionId,
      sourceDenominator: result.sourceDenominator,
      transactionHash: result.transactionHash,
      prepareTransactionHash: result.prepareTransactionHash,
      blockNumber: result.blockNumber,
    };
  }

  async syncTemplate(
    template: CanonicalSportsTemplate,
    options: SyncTemplateOptions = {},
  ): Promise<TemplateCtfMirrorResult> {
    if (!this.config.polymarketResolutionMirror.enabled) {
      return this.templateResult('disabled', template);
    }
    const sourceRpcUrl = options.sourceRpcUrl ?? this.config.polymarketResolutionMirror.sourceRpcUrl;
    if (!sourceRpcUrl) {
      return this.templateResult('missing-source-rpc', template);
    }
    if (!this.isAllowedForkRpc()) {
      this.logger?.warn?.(
        { rpcUrl: this.config.chain.rpcUrl },
        'resolution mirror refused non-local fork rpc',
      );
      return this.templateResult('non-local-fork-rpc', template);
    }

    if (!isBytes32(template.conditionId) || !isBytes32(template.questionId)) {
      return this.templateResult('invalid-template', template, {
        error: 'Template conditionId or questionId is not bytes32',
      });
    }

    const [forkChainId, sourceChainId] = await Promise.all([
      this.chain.readChainId(),
      this.chain.readChainId({ rpcUrl: sourceRpcUrl }),
    ]);
    if (forkChainId !== 137 || sourceChainId !== 137) {
      this.logger?.warn?.(
        { forkChainId, sourceChainId },
        'resolution mirror refused non-Polygon chain id',
      );
      return this.templateResult('invalid-chain-id', template);
    }

    const outcomeSlotCount = this.config.polymarketResolutionMirror.outcomeSlotCount;
    const oracle = this.resolveOracleAddress(template, outcomeSlotCount);
    if (!oracle) {
      this.logger?.warn?.({
        templateHash: template.templateHash,
        templateId: template.templateId,
        conditionId: template.conditionId,
        questionId: template.questionId,
        resolvedBy: template.resolvedBy,
        ctfOracleAddress: template.ctfOracleAddress,
        ctfOracleValidationStatus: template.ctfOracleValidationStatus,
      }, 'resolution mirror could not validate CTF oracle for template');
      return this.templateResult('invalid-template', template, {
        error: 'CTF condition id does not match oracle, question id, and slot count',
      });
    }
    const oracleAddress = oracle.address;
    const conditionId = template.conditionId as Hex;
    this.logger?.info({
      templateHash: template.templateHash,
      templateId: template.templateId,
      conditionId,
      oracleAddress,
      oracleSource: oracle.source,
    }, 'resolution mirror selected CTF oracle');

    const sourceState = await this.chain.readCtfPayoutState(conditionId, {
      rpcUrl: sourceRpcUrl,
    });

    if (
      sourceState.outcomeSlotCount !== 0
      && sourceState.outcomeSlotCount !== outcomeSlotCount
    ) {
      return this.templateResult('invalid-template', template, {
        sourceDenominator: sourceState.denominator,
        error: 'Source CTF outcome slot count does not match configured binary slot count',
      });
    }

    const localState = await this.chain.readCtfPayoutState(conditionId, {
      fallbackOutcomeSlotCount: 0,
    });
    if (localState.denominator > 0n) {
      return this.templateResult('already-resolved', template, {
        sourceDenominator: sourceState.denominator,
        forkDenominator: localState.denominator,
      });
    }

    if (sourceState.denominator === 0n) {
      if (localState.outcomeSlotCount === 0) {
        const writableForkCheck = await this.ensureWritableFork(template);
        if (writableForkCheck) return writableForkCheck;
        const prepareTransactionHash = await this.chain.writePrepareCondition(
          oracleAddress,
          template.questionId as Hex,
          outcomeSlotCount,
        );
        const receipt = await this.chain.wait(prepareTransactionHash);
        this.logger?.info({
          templateHash: template.templateHash,
          templateId: template.templateId,
          conditionId: template.conditionId,
          oracleAddress,
          prepareTransactionHash,
        }, 'template CTF condition prepared');
        return this.templateResult('prepared', template, {
          sourceDenominator: sourceState.denominator,
          forkDenominator: localState.denominator,
          prepareTransactionHash,
          blockNumber: receipt.blockNumber.toString(),
        });
      }
      return this.templateResult('source-unresolved', template, {
        sourceDenominator: sourceState.denominator,
        forkDenominator: localState.denominator,
      });
    }

    if (
      sourceState.outcomeSlotCount !== outcomeSlotCount
      || sourceState.numerators.length !== outcomeSlotCount
    ) {
      return this.templateResult('invalid-template', template, {
        sourceDenominator: sourceState.denominator,
        forkDenominator: localState.denominator,
        error: 'Source CTF payout numerator count does not match configured binary slot count',
      });
    }

    const writableForkCheck = await this.ensureWritableFork(template);
    if (writableForkCheck) return writableForkCheck;
    const mirrored = await this.chain.mirrorCtfPayout({
      oracleAddress,
      questionId: template.questionId as Hex,
      conditionId,
      outcomeSlotCount,
      numerators: sourceState.numerators,
    });
    this.logger?.info({
      templateHash: template.templateHash,
      templateId: template.templateId,
      conditionId,
      oracleAddress,
      mirrorStatus: mirrored.status,
      transactionHash: mirrored.transactionHash,
    }, 'template CTF payout synced');
    return this.templateResult(
      mirrored.status === 'mirrored' ? 'mirrored' : 'already-resolved',
      template,
      {
        sourceDenominator: sourceState.denominator,
        forkDenominator: localState.denominator,
        transactionHash: mirrored.transactionHash,
        prepareTransactionHash: mirrored.prepareTransactionHash,
        blockNumber: mirrored.blockNumber,
      },
    );
  }

  private betResult(
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

  private templateResult(
    status: ResolutionMirrorStatus,
    template: CanonicalSportsTemplate,
    fields: {
      sourceDenominator?: bigint | null;
      forkDenominator?: bigint | null;
      transactionHash?: Hex | null;
      prepareTransactionHash?: Hex | null;
      blockNumber?: string | null;
      error?: string | null;
    } = {},
  ): TemplateCtfMirrorResult {
    return {
      status,
      templateHash: template.templateHash as Hex,
      templateId: template.templateId,
      conditionId: template.conditionId as Hex,
      sourceDenominator: fields.sourceDenominator?.toString() ?? null,
      forkDenominator: fields.forkDenominator?.toString() ?? null,
      transactionHash: fields.transactionHash ?? null,
      prepareTransactionHash: fields.prepareTransactionHash ?? null,
      blockNumber: fields.blockNumber ?? null,
      error: fields.error ?? null,
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

  private resolveOracleAddress(
    template: CanonicalSportsTemplate,
    outcomeSlotCount: number,
  ): ResolvedOracleAddress | null {
    const conditionId = template.conditionId.toLowerCase();
    const questionId = template.questionId as Hex;

    if (template.ctfOracleAddress && isAddress(template.ctfOracleAddress)) {
      const oracleAddress = getAddress(template.ctfOracleAddress);
      if (!this.isConfiguredOracleAddress(oracleAddress)) {
        this.logger?.warn?.({
          templateHash: template.templateHash,
          templateId: template.templateId,
          conditionId: template.conditionId,
          ctfOracleAddress: template.ctfOracleAddress,
        }, 'template stored CTF oracle is not configured as an allowed mirror oracle');
      } else if (ctfConditionIdFor(oracleAddress, questionId, outcomeSlotCount).toLowerCase() === conditionId) {
        return {
          address: oracleAddress,
          source: `template:${template.ctfOracleSource ?? 'stored'}`,
        };
      } else {
        this.logger?.warn?.({
          templateHash: template.templateHash,
          templateId: template.templateId,
          conditionId: template.conditionId,
          ctfOracleAddress: template.ctfOracleAddress,
        }, 'template stored CTF oracle did not validate against condition id');
      }
    }

    const fallback = resolveTemplateCtfOracle({
      conditionId: template.conditionId,
      questionId: template.questionId,
      resolvedBy: template.resolvedBy,
      negRisk: false,
      includeNegRiskOracleFallback: true,
      outcomeSlotCount,
      negRiskOracleAddress: this.config.polymarketResolutionMirror.negRiskOracleAddress,
      oracleAddresses: this.config.polymarketResolutionMirror.oracleAddresses,
      oracleAddress: this.config.polymarketResolutionMirror.oracleAddress,
    });
    if (!fallback.ctfOracleAddress) return null;
    return {
      address: fallback.ctfOracleAddress,
      source: `fallback:${fallback.ctfOracleSource ?? 'unknown'}`,
    };
  }

  private isConfiguredOracleAddress(address: Address): boolean {
    return configuredCtfOracleAddressKeys({
      outcomeSlotCount: this.config.polymarketResolutionMirror.outcomeSlotCount,
      negRiskOracleAddress: this.config.polymarketResolutionMirror.negRiskOracleAddress,
      oracleAddresses: this.config.polymarketResolutionMirror.oracleAddresses,
      oracleAddress: this.config.polymarketResolutionMirror.oracleAddress,
    }).has(address.toLowerCase());
  }

  private async ensureWritableFork(
    template: CanonicalSportsTemplate,
  ): Promise<TemplateCtfMirrorResult | null> {
    try {
      await this.chain.assertAnvilRpc();
      return null;
    } catch (error) {
      this.logger?.warn?.({
        templateHash: template.templateHash,
        templateId: template.templateId,
        conditionId: template.conditionId,
        rpcUrl: this.config.chain.rpcUrl,
        error: error instanceof Error ? error.message : String(error),
      }, 'resolution mirror refused fork write because target RPC is not Anvil-compatible');
      return this.templateResult('non-local-fork-rpc', template, {
        error: 'Fork write RPC did not expose Anvil methods',
      });
    }
  }
}
