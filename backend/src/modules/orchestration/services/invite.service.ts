import { randomUUID } from 'node:crypto';
import type { Hex } from 'viem';
import type { AppConfig } from '../../../config/env.js';
import type { CanonicalSportsTemplate } from '../../templates/domain/types.js';
import { betAcceptanceTypes, betOfferTypes, type BetAcceptanceMessage, type BetOfferMessage } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { BetInvite, UserAccount } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import { httpError } from './errors.js';
import { inviteToOffer, stringifyBigints, ZERO_ADDRESS } from './invite-payloads.js';
import type { WalletService } from './wallet.service.js';

export class InviteService {
  constructor(
    private readonly repository: OrchestrationRepository,
    private readonly walletService: WalletService,
    private readonly chain: ChainService,
    private readonly config: AppConfig,
  ) {}

  async create(user: UserAccount, template: CanonicalSportsTemplate, stake: bigint, loserFee: bigint, makerOutcomeIndex: number, taker?: string) {
    const wallet = await this.walletService.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    if (![template.outcomeA.providerOutcomeIndex, template.outcomeB.providerOutcomeIndex].includes(makerOutcomeIndex)) {
      throw httpError(400, 'INVALID_MAKER_OUTCOME');
    }
    const takerAddress = taker ? this.chain.normalizeAddress(taker) : ZERO_ADDRESS;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const deadlineSeconds = Math.min(nowSeconds + this.config.invites.ttlSeconds, template.bettingCloseAt);
    if (deadlineSeconds <= nowSeconds) throw httpError(400, 'TEMPLATE_CLOSED');
    const deadline = BigInt(deadlineSeconds);
    const nonce = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const offer: BetOfferMessage = {
      maker: wallet.address,
      taker: takerAddress,
      templateHash: template.templateHash as Hex,
      conditionId: template.conditionId as Hex,
      makerOutcomeIndex,
      stake,
      loserFee,
      nonce,
      deadline,
    };
    const offerHash = this.chain.hashOffer(offer);
    const now = new Date();
    const invite: BetInvite = {
      id: `invite-${randomUUID()}`,
      makerUserId: user.id,
      takerUserId: null,
      templateHash: offer.templateHash,
      conditionId: offer.conditionId,
      makerAddress: wallet.address,
      takerAddress: null,
      makerOutcomeIndex,
      takerOutcomeIndex: null,
      stake: stake.toString(),
      loserFee: loserFee.toString(),
      offerNonce: nonce.toString(),
      acceptanceNonce: null,
      offerHash,
      offerPayload: this.payload('BetOffer', offer),
      acceptancePayload: null,
      status: 'created',
      betId: null,
      expiresAt: new Date(Number(deadline) * 1000),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveInvite(invite);
    return invite;
  }

  async accept(user: UserAccount, inviteId: string, takerOutcomeIndex: number) {
    const invite = await this.repository.findInvite(inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.expiresAt <= new Date()) throw httpError(400, 'INVITE_EXPIRED');
    if (invite.status !== 'created') throw httpError(400, 'INVITE_NOT_OPEN');
    const wallet = await this.walletService.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    if (wallet.address === invite.makerAddress) throw httpError(400, 'MAKER_CANNOT_ACCEPT_OWN_INVITE');
    const signedOffer = inviteToOffer(invite);
    if (signedOffer.taker !== ZERO_ADDRESS && signedOffer.taker !== wallet.address) throw httpError(403, 'UNAUTHORIZED_TAKER');
    if (takerOutcomeIndex === invite.makerOutcomeIndex) throw httpError(400, 'TAKER_OUTCOME_MUST_DIFFER');
    const deadline = BigInt(Math.floor(invite.expiresAt.getTime() / 1000));
    const nonce = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const acceptance: BetAcceptanceMessage = {
      taker: wallet.address,
      offerHash: invite.offerHash,
      takerOutcomeIndex,
      nonce,
      deadline,
    };
    invite.takerUserId = user.id;
    invite.takerAddress = wallet.address;
    invite.takerOutcomeIndex = takerOutcomeIndex;
    invite.acceptanceNonce = nonce.toString();
    invite.acceptancePayload = this.payload('BetAcceptance', acceptance);
    invite.status = 'accepted';
    invite.updatedAt = new Date();
    await this.repository.saveInvite(invite);
    return invite;
  }

  payload(primaryType: 'BetOffer' | 'BetAcceptance', message: BetOfferMessage | BetAcceptanceMessage) {
    return {
      domain: this.chain.domain(),
      types: primaryType === 'BetOffer' ? betOfferTypes : betAcceptanceTypes,
      primaryType,
      message: stringifyBigints(message),
    };
  }
}
