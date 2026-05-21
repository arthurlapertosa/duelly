import { randomUUID } from 'node:crypto';
import { decodeEventLog, verifyTypedData, type Hex } from 'viem';
import { betAcceptanceTypes, betOfferTypes, escrowAbi } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { OrchestrationRepository } from '../repository.js';
import { httpError } from './errors.js';
import { inviteToAcceptance, inviteToOffer } from './invite-payloads.js';
import { permitFromStored } from './invite.service.js';

export class RelayerService {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

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
    const { walletClient, account } = this.chain.requireWalletClient();
    try {
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
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
          if (decoded.eventName === 'BetFunded') {
            betId = ((decoded.args as { betId: bigint }).betId).toString();
          }
        } catch {
          // Ignore non-escrow logs in the funding transaction.
        }
      }
      invite.status = betId ? 'funded' : 'funding_submitted';
      invite.betId = betId;
      invite.updatedAt = new Date();
      await this.repository.saveInvite(invite);
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
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'failed',
        transactionHash: null,
        betId: null,
        error: error instanceof Error ? error.message : String(error),
        payload: null,
        createdAt: new Date(),
      });
      throw error;
    }
  }
}
