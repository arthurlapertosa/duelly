import { randomUUID } from 'node:crypto';
import { decodeEventLog, verifyTypedData, type Address, type Hex } from 'viem';
import { betAcceptanceTypes, betOfferTypes, escrowAbi } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { OrchestrationRepository } from '../repository.js';
import type { CanonicalSportsTemplate } from '../../templates/domain/types.js';
import { httpError } from './errors.js';
import { inviteToAcceptance, inviteToOffer } from './invite-payloads.js';
import { permitFromStored } from './invite.service.js';

export class RelayerService {
  constructor(
    private readonly repository: OrchestrationRepository,
    private readonly chain: ChainService,
    private readonly findAcceptedTemplate?: (templateHash: Hex) => Promise<CanonicalSportsTemplate | undefined>,
  ) {}

  async fund(input: {
    inviteId: string;
  }) {
    const invite = await this.repository.findInvite(input.inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.status !== 'accepted' || !invite.takerAddress || invite.takerOutcomeIndex === null || !invite.acceptancePayload) {
      throw httpError(400, 'INVITE_NOT_READY_FOR_FUNDING');
    }
    if (!invite.offerSignature || !invite.makerPermit || !invite.makerAuthorizedAt) throw httpError(400, 'MISSING_MAKER_AUTHORIZATION');
    if (!invite.acceptanceSignature || !invite.takerPermit || !invite.takerAuthorizedAt) throw httpError(400, 'MISSING_TAKER_AUTHORIZATION');
    const makerPermit = permitFromStored(invite.makerPermit);
    const takerPermit = permitFromStored(invite.takerPermit);
    if (!makerPermit || !takerPermit) throw httpError(400, 'INVALID_STORED_PERMIT');
    const requestId = `relayer-${randomUUID()}`;
    const offer = inviteToOffer(invite);
    const acceptance = inviteToAcceptance(invite);
    const makerOk = await verifyTypedData({
      address: invite.makerAddress,
      domain: this.chain.domain(),
      types: betOfferTypes,
      primaryType: 'BetOffer',
      message: offer,
      signature: invite.offerSignature,
    });
    const takerOk = await verifyTypedData({
      address: invite.takerAddress,
      domain: this.chain.domain(),
      types: betAcceptanceTypes,
      primaryType: 'BetAcceptance',
      message: acceptance,
      signature: invite.acceptanceSignature,
    });
    if (!makerOk || !takerOk) {
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'rejected',
        transactionHash: null,
        betId: null,
        error: 'INVALID_SIGNATURE',
        payload: null,
        createdAt: new Date(),
      });
      throw httpError(400, 'INVALID_SIGNATURE');
    }

    const { escrowAddress } = this.chain.requireAddresses();
    let relayerWallet: ReturnType<ChainService['requireWalletClient']>;
    try {
      relayerWallet = this.chain.requireWalletClient();
    } catch {
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'failed',
        transactionHash: null,
        betId: null,
        error: 'RELAYER_PRIVATE_KEY_NOT_CONFIGURED',
        payload: null,
        createdAt: new Date(),
      });
      throw httpError(503, 'RELAYER_PRIVATE_KEY_NOT_CONFIGURED');
    }
    const { walletClient, account } = relayerWallet;
    try {
      await this.ensureTemplateRegistered(invite.templateHash, requestId, invite.id);
      const tx = await walletClient.writeContract({
        account,
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'acceptBetWithPermits',
        args: [offer, acceptance, invite.offerSignature, invite.acceptanceSignature, makerPermit, takerPermit],
        chain: null,
      });
      const receipt = await this.chain.wait(tx);
      let betId: string | null = null;
      let indexedBet: Parameters<OrchestrationRepository['saveIndexedBet']>[0] | null = null;
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() !== escrowAddress.toLowerCase()) continue;
          const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
          if (decoded.eventName === 'BetFunded') {
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
              sourceTransactionHash: tx,
              sourceBlockNumber: receipt.blockNumber.toString(),
              updatedAt: new Date(),
            };
          }
        } catch {
          // Ignore non-escrow logs in the funding transaction.
        }
      }
      invite.status = betId ? 'funded' : 'funding_submitted';
      invite.betId = betId;
      invite.updatedAt = new Date();
      await this.repository.saveInvite(invite);
      if (indexedBet) await this.repository.saveIndexedBet(indexedBet);
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: receipt.status === 'success' ? 'succeeded' : 'failed',
        transactionHash: tx,
        betId,
        error: null,
        payload: { inviteId: invite.id },
        createdAt: new Date(),
      });
      return { requestId, transactionHash: tx, status: receipt.status, betId };
    } catch (error) {
      const code = relayerErrorCode(error);
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'failed',
        transactionHash: null,
        betId: null,
        error: code ?? (error instanceof Error ? error.message : String(error)),
        payload: null,
        createdAt: new Date(),
      });
      if (code) throw httpError(code === 'TRANSACTION_REVERTED' ? 502 : 409, code);
      throw error;
    }
  }

  private async ensureTemplateRegistered(templateHash: Hex, requestId: string, inviteId: string) {
    const existing = await this.chain.readTemplate(templateHash);
    if (existing.registered && existing.active) return;
    if (existing.registered && !existing.active) throw httpError(409, 'TEMPLATE_NOT_ACCEPTED');
    const template = await this.findAcceptedTemplate?.(templateHash);
    if (!template) throw httpError(409, 'TEMPLATE_NOT_REGISTERED_ON_CHAIN');
    const transactionHash = await this.chain.writeRegisterTemplate(template);
    const receipt = await this.chain.wait(transactionHash);
    await this.repository.saveRelayerAttempt({
      id: `attempt-${randomUUID()}`,
      requestId,
      inviteId,
      action: 'registerTemplate',
      status: receipt.status === 'success' ? 'succeeded' : 'failed',
      transactionHash,
      betId: null,
      error: receipt.status === 'success' ? null : 'TEMPLATE_REGISTRATION_FAILED',
      payload: { templateHash },
      createdAt: new Date(),
    });
    if (receipt.status !== 'success') throw httpError(502, 'TEMPLATE_REGISTRATION_FAILED');
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
