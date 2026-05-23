import { randomUUID } from 'node:crypto';
import { decodeEventLog, verifyTypedData, type Address, type Hex } from 'viem';
import type { AppConfig } from '../../../config/env.js';
import { betAcceptanceTypes, betOfferTypes, escrowAbi } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { BetInvite, RelayerAttempt } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import type { CanonicalSportsTemplate } from '../../templates/domain/types.js';
import { httpError } from './errors.js';
import { inviteToAcceptance, inviteToOffer } from './invite-payloads.js';
import { permitFromStored } from './invite.service.js';

interface WorkerLogger {
  info(input: unknown, message?: string): void;
  warn(input: unknown, message?: string): void;
  error(input: unknown, message?: string): void;
}

export class RelayerService {
  constructor(
    private readonly repository: OrchestrationRepository,
    private readonly chain: ChainService,
    private readonly findAcceptedTemplate?: (templateHash: Hex) => Promise<CanonicalSportsTemplate | undefined>,
    private readonly logger?: WorkerLogger,
  ) {}

  async fund(input: { inviteId: string }) {
    return await this.enqueueFunding(input);
  }

  async enqueueFunding(input: { inviteId: string }) {
    const deploymentKey = this.chain.deploymentKey();
    const invite = await this.repository.findInvite(input.inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');

    if (invite.status === 'funded' && invite.betId) {
      return this.fundingResult({
        id: `attempt-${invite.id}`,
        requestId: `funded-${invite.id}`,
        deploymentKey,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'succeeded',
        transactionHash: null,
        betId: invite.betId,
        error: null,
        payload: { inviteId: invite.id },
        createdAt: invite.updatedAt,
      });
    }

    if (invite.status !== 'accepted' && invite.status !== 'funding_submitted') {
      throw httpError(400, 'INVITE_NOT_READY_FOR_FUNDING');
    }
    await this.assertFundingReady(invite);
    try {
      this.chain.requireWalletClient();
    } catch {
      throw httpError(503, 'RELAYER_PRIVATE_KEY_NOT_CONFIGURED');
    }

    const existing = await this.repository.findLatestRelayerAttemptForInviteAction(
      invite.id,
      'acceptBetWithPermits',
      deploymentKey,
    );
    if (existing && (existing.status === 'submitted' || existing.status === 'processing' || existing.status === 'succeeded')) {
      if (invite.status === 'accepted') {
        invite.status = 'funding_submitted';
        invite.deploymentKey = deploymentKey;
        invite.updatedAt = new Date();
        await this.repository.saveInvite(invite);
      }
      return this.fundingResult(existing);
    }

    const now = new Date();
    invite.status = 'funding_submitted';
    invite.deploymentKey = deploymentKey;
    invite.updatedAt = now;
    await this.repository.saveInvite(invite);

    const attempt: RelayerAttempt = {
      id: `attempt-${randomUUID()}`,
      requestId: `relayer-${randomUUID()}`,
      deploymentKey,
      inviteId: invite.id,
      action: 'acceptBetWithPermits',
      status: 'submitted',
      transactionHash: null,
      betId: null,
      error: null,
      payload: { inviteId: invite.id, stage: 'queued' },
      createdAt: now,
      lockedAt: null,
    };
    await this.repository.saveRelayerAttempt(attempt);
    return this.fundingResult(attempt);
  }

  async processPendingFunding(limit: number, processingTimeoutMs = 120_000) {
    const deploymentKey = this.chain.deploymentKey();
    const attempts = await this.repository.claimRelayerAttemptsForProcessing(
      'acceptBetWithPermits',
      deploymentKey,
      limit,
      new Date(Date.now() - processingTimeoutMs),
    );
    for (const attempt of attempts) await this.processFundingAttempt(attempt);
    return attempts.length;
  }

  async processFundingAttempt(attempt: RelayerAttempt) {
    if (!attempt.inviteId || (attempt.status !== 'submitted' && attempt.status !== 'processing')) return attempt;
    this.logger?.info({
      attemptId: attempt.id,
      inviteId: attempt.inviteId,
      status: attempt.status,
      hasTransactionHash: Boolean(attempt.transactionHash),
    }, 'relayer funding attempt processing');
    const invite = await this.repository.findInvite(attempt.inviteId);
    if (!invite) return await this.failAttempt(attempt, undefined, 'INVITE_NOT_FOUND');
    if (invite.status === 'funded' && invite.betId) {
      attempt.status = 'succeeded';
      attempt.betId = invite.betId;
      attempt.error = null;
      attempt.lockedAt = null;
      await this.repository.saveRelayerAttempt(attempt);
      return attempt;
    }
    if (invite.status !== 'funding_submitted') return await this.releaseAttempt(attempt);

    try {
      await this.assertFundingReady(invite);
      const templateReady = await this.ensureTemplateRegistered(invite, attempt);
      if (!templateReady) {
        this.logger?.info({
          attemptId: attempt.id,
          inviteId: invite.id,
          templateHash: invite.templateHash,
        }, 'relayer funding waiting for template registration');
        return await this.releaseAttempt(attempt);
      }
      if (!attempt.transactionHash) {
        this.logger?.info({
          attemptId: attempt.id,
          inviteId: invite.id,
        }, 'relayer funding transaction submitting');
        const tx = await this.submitFundingTransaction(invite);
        attempt.transactionHash = tx;
        attempt.status = 'submitted';
        attempt.lockedAt = null;
        attempt.error = null;
        attempt.payload = { inviteId: invite.id, stage: 'funding_submitted' };
        await this.repository.saveRelayerAttempt(attempt);
        this.logger?.info({
          attemptId: attempt.id,
          inviteId: invite.id,
          transactionHash: tx,
        }, 'relayer funding transaction submitted');
        return attempt;
      }
      return await this.reconcileFundingReceipt(invite, attempt);
    } catch (error) {
      const code = relayerErrorCode(error);
      if (code) return await this.failAttempt(attempt, invite, code);
      return await this.failAttempt(attempt, invite, error instanceof Error ? error.message : String(error));
    }
  }

  private async assertFundingReady(invite: BetInvite) {
    if (invite.expiresAt <= new Date()) throw httpError(400, 'INVITE_EXPIRED');
    if (!invite.takerAddress || invite.takerOutcomeIndex === null || !invite.acceptancePayload) {
      throw httpError(400, 'INVITE_NOT_READY_FOR_FUNDING');
    }
    if (!invite.offerSignature || !invite.makerPermit || !invite.makerAuthorizedAt) throw httpError(400, 'MISSING_MAKER_AUTHORIZATION');
    if (!invite.acceptanceSignature || !invite.takerPermit || !invite.takerAuthorizedAt) throw httpError(400, 'MISSING_TAKER_AUTHORIZATION');
    if (!permitFromStored(invite.makerPermit) || !permitFromStored(invite.takerPermit)) throw httpError(400, 'INVALID_STORED_PERMIT');

    const offer = inviteToOffer(invite);
    const acceptance = inviteToAcceptance(invite);
    const [makerOk, takerOk] = await Promise.all([
      verifyTypedData({
        address: invite.makerAddress,
        domain: this.chain.domain(),
        types: betOfferTypes,
        primaryType: 'BetOffer',
        message: offer,
        signature: invite.offerSignature,
      }),
      verifyTypedData({
        address: invite.takerAddress,
        domain: this.chain.domain(),
        types: betAcceptanceTypes,
        primaryType: 'BetAcceptance',
        message: acceptance,
        signature: invite.acceptanceSignature,
      }),
    ]);
    if (!makerOk || !takerOk) throw httpError(400, 'INVALID_SIGNATURE');
  }

  private async ensureTemplateRegistered(invite: BetInvite, fundingAttempt: RelayerAttempt): Promise<boolean> {
    const existing = await this.chain.readTemplate(invite.templateHash);
    if (existing.registered && existing.active) return true;
    if (existing.registered && !existing.active) throw httpError(409, 'TEMPLATE_NOT_ACCEPTED');

    const registerAttempt = await this.repository.findLatestRelayerAttemptForInviteAction(
      invite.id,
      'registerTemplate',
      fundingAttempt.deploymentKey,
    );
    if (registerAttempt?.transactionHash && registerAttempt.status === 'submitted') {
      const receipt = await this.chain.receipt(registerAttempt.transactionHash);
      if (!receipt) return false;
      registerAttempt.status = receipt.status === 'success' ? 'succeeded' : 'failed';
      registerAttempt.error = receipt.status === 'success' ? null : 'TEMPLATE_REGISTRATION_FAILED';
      await this.repository.saveRelayerAttempt(registerAttempt);
      if (receipt.status !== 'success') throw httpError(502, 'TEMPLATE_REGISTRATION_FAILED');
      return true;
    }

    const template = await this.findAcceptedTemplate?.(invite.templateHash);
    if (!template) throw httpError(409, 'TEMPLATE_NOT_REGISTERED_ON_CHAIN');
    const transactionHash = await this.chain.writeRegisterTemplate(template);
    await this.repository.saveRelayerAttempt({
      id: `attempt-${randomUUID()}`,
      requestId: fundingAttempt.requestId,
      deploymentKey: fundingAttempt.deploymentKey,
      inviteId: invite.id,
      action: 'registerTemplate',
      status: 'submitted',
      transactionHash,
      betId: null,
      error: null,
      payload: { inviteId: invite.id, templateHash: invite.templateHash },
      createdAt: new Date(),
      lockedAt: null,
    });
    return false;
  }

  private async submitFundingTransaction(invite: BetInvite): Promise<Hex> {
    const { escrowAddress } = this.chain.requireAddresses();
    const { walletClient, account } = this.chain.requireWalletClient();
    const makerPermit = permitFromStored(invite.makerPermit);
    const takerPermit = permitFromStored(invite.takerPermit);
    if (!makerPermit || !takerPermit || !invite.offerSignature || !invite.acceptanceSignature) {
      throw httpError(400, 'INVALID_STORED_PERMIT');
    }
    return await walletClient.writeContract({
      account,
      address: escrowAddress,
      abi: escrowAbi,
      functionName: 'acceptBetWithPermits',
      args: [inviteToOffer(invite), inviteToAcceptance(invite), invite.offerSignature, invite.acceptanceSignature, makerPermit, takerPermit],
      chain: null,
    });
  }

  private async reconcileFundingReceipt(invite: BetInvite, attempt: RelayerAttempt) {
    if (!attempt.transactionHash) return attempt;
    const receipt = await this.chain.receipt(attempt.transactionHash);
    if (!receipt) {
      this.logger?.info({
        attemptId: attempt.id,
        inviteId: invite.id,
        transactionHash: attempt.transactionHash,
      }, 'relayer funding receipt pending');
      return await this.releaseAttempt(attempt);
    }
    if (receipt.status !== 'success') return await this.failAttempt(attempt, invite, 'TRANSACTION_REVERTED');

    const { escrowAddress } = this.chain.requireAddresses();
    let betId: string | null = null;
    let indexedBet: Parameters<OrchestrationRepository['saveIndexedBet']>[0] | null = null;
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() !== escrowAddress.toLowerCase()) continue;
        const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
        if (decoded.eventName !== 'BetFunded') continue;
        const args = decoded.args as {
          betId: bigint;
          templateHash: Hex;
          conditionId: Hex;
          playerA: Address;
          playerB: Address;
          playerAOutcomeIndex: number;
          playerBOutcomeIndex: number;
          stake: bigint;
          loserFee: bigint;
        };
        betId = args.betId.toString();
        indexedBet = {
          deploymentKey: attempt.deploymentKey,
          betId,
          inviteId: invite.id,
          templateHash: args.templateHash,
          conditionId: args.conditionId,
          playerA: args.playerA,
          playerB: args.playerB,
          playerAOutcomeIndex: args.playerAOutcomeIndex,
          playerBOutcomeIndex: args.playerBOutcomeIndex,
          stake: args.stake.toString(),
          loserFee: args.loserFee.toString(),
          status: 'Funded',
          winner: null,
          winnerPayout: null,
          treasuryPayout: null,
          sourceTransactionHash: attempt.transactionHash,
          sourceBlockNumber: receipt.blockNumber.toString(),
          updatedAt: new Date(),
        };
      } catch {
        // Ignore non-escrow logs in the funding transaction.
      }
    }
    if (!betId) return await this.failAttempt(attempt, invite, 'BET_FUNDED_EVENT_NOT_FOUND');

    invite.status = 'funded';
    invite.betId = betId;
    invite.deploymentKey = attempt.deploymentKey;
    invite.updatedAt = new Date();
    await this.repository.saveInvite(invite);
    if (indexedBet) await this.repository.saveIndexedBet(indexedBet);
    attempt.status = 'succeeded';
    attempt.betId = betId;
    attempt.error = null;
    attempt.lockedAt = null;
    attempt.payload = { inviteId: invite.id, stage: 'funded' };
    await this.repository.saveRelayerAttempt(attempt);
    this.logger?.info({
      attemptId: attempt.id,
      inviteId: invite.id,
      transactionHash: attempt.transactionHash,
      betId,
    }, 'relayer funding succeeded');
    return attempt;
  }

  private async failAttempt(attempt: RelayerAttempt, invite: BetInvite | undefined, error: string) {
    attempt.status = 'failed';
    attempt.error = error;
    attempt.lockedAt = null;
    await this.repository.saveRelayerAttempt(attempt);
    if (invite?.status === 'funding_submitted') {
      invite.status = 'accepted';
      invite.updatedAt = new Date();
      await this.repository.saveInvite(invite);
    }
    this.logger?.warn({
      attemptId: attempt.id,
      inviteId: attempt.inviteId,
      error,
    }, 'relayer funding failed');
    return attempt;
  }

  private async releaseAttempt(attempt: RelayerAttempt) {
    if (attempt.status === 'processing') {
      attempt.status = 'submitted';
      attempt.lockedAt = null;
      await this.repository.saveRelayerAttempt(attempt);
    }
    return attempt;
  }

  private fundingResult(attempt: RelayerAttempt) {
    return {
      requestId: attempt.requestId,
      transactionHash: attempt.transactionHash,
      status: attempt.status,
      betId: attempt.betId,
      error: attempt.error,
    };
  }
}

export class RelayerWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly config: AppConfig,
    private readonly relayer: RelayerService,
    private readonly logger?: WorkerLogger,
  ) {}

  start(): boolean {
    if (!this.config.relayerWorker.enabled || this.timer) return false;
    this.timer = setInterval(() => {
      void this.tick().catch((error) => this.logger?.error({ error }, 'relayer worker tick failed'));
    }, this.config.relayerWorker.intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => this.logger?.error({ error }, 'relayer worker initial tick failed'));
    this.logger?.info({
      intervalMs: this.config.relayerWorker.intervalMs,
      batchSize: this.config.relayerWorker.batchSize,
    }, 'relayer worker started');
    return true;
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    this.logger?.info({}, 'relayer worker stopped');
  }

  async tick(): Promise<{ processed: number }> {
    if (this.running) return { processed: 0 };
    this.running = true;
    try {
      const processed = await this.relayer.processPendingFunding(
        this.config.relayerWorker.batchSize,
        this.config.relayerWorker.processingTimeoutMs,
      );
      return { processed };
    } finally {
      this.running = false;
    }
  }
}

export function relayerErrorCode(error: unknown): string | null {
  const errorName = contractErrorName(error);
  if (errorName === 'TemplateNotRegistered') return 'TEMPLATE_NOT_REGISTERED_ON_CHAIN';
  if (errorName === 'TemplateInactive' || errorName === 'InvalidTemplate') return 'TEMPLATE_NOT_ACCEPTED';
  if (errorName === 'TemplateClosed') return 'TEMPLATE_CLOSED';
  if (errorName === 'SignatureExpired') return 'INVITE_EXPIRED';
  if (errorName === 'InvalidSignature') return 'INVALID_SIGNATURE';
  if (errorName === 'InvalidStake') return 'INVALID_STAKE';
  if (errorName === 'InvalidLoserFee') return 'LOSER_FEE_MISMATCH';
  if (errorName === 'ConditionResolved') return 'CONDITION_RESOLVED';
  if (errorName === 'PermitValueTooLow') return 'PERMIT_VALUE_MISMATCH';
  if (errorName === 'UnauthorizedTaker') return 'UNAUTHORIZED_TAKER';
  if (errorName === 'SameOutcome') return 'TAKER_OUTCOME_MUST_DIFFER';
  if (errorName === 'SamePlayer') return 'MAKER_CANNOT_ACCEPT_OWN_INVITE';
  if (errorName) return 'TRANSACTION_REVERTED';

  const message = errorText(error);
  if (message.includes('0xfa674946')) return 'TEMPLATE_NOT_REGISTERED_ON_CHAIN';
  if (/template not registered/i.test(message)) return 'TEMPLATE_NOT_REGISTERED_ON_CHAIN';
  return null;
}

function contractErrorName(error: unknown): string | null {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const value = current as { data?: unknown; cause?: unknown; errorName?: unknown; name?: unknown; shortMessage?: unknown; message?: unknown };
    if (typeof value.errorName === 'string') return value.errorName;
    if (value.data && typeof value.data === 'object') {
      const data = value.data as { errorName?: unknown };
      if (typeof data.errorName === 'string') return data.errorName;
    }
    const text = `${typeof value.shortMessage === 'string' ? value.shortMessage : ''}\n${typeof value.message === 'string' ? value.message : ''}`;
    const match = text.match(/\b([A-Z][A-Za-z0-9]+)\(\)/);
    if (match) return match[1];
    current = value.cause;
  }
  return null;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
