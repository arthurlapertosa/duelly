import { randomUUID } from 'node:crypto';
import { verifyTypedData, type Address, type Hex } from 'viem';
import type { AppConfig } from '../../../config/env.js';
import type { CanonicalSportsTemplate } from '../../templates/domain/types.js';
import { betAcceptanceTypes, betOfferTypes, permitTypes, type BetAcceptanceMessage, type BetOfferMessage, type PermitData } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { BetInvite, StoredPermit, UserAccount } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import type { Brl1Service } from './brl1.service.js';
import { httpError } from './errors.js';
import { inviteToOffer, stringifyBigints, ZERO_ADDRESS } from './invite-payloads.js';
import type { WalletService } from './wallet.service.js';
import { normalizeEmail } from './auth-helpers.js';

export class InviteService {
  constructor(
    private readonly repository: OrchestrationRepository,
    private readonly walletService: WalletService,
    private readonly chain: ChainService,
    private readonly config: AppConfig,
    private readonly brl1: Brl1Service,
  ) {}

  async create(
    user: UserAccount,
    template: CanonicalSportsTemplate,
    stake: bigint,
    loserFee: bigint,
    makerOutcomeIndex: number,
    taker?: string,
    recipient?: string,
  ) {
    const wallet = await this.walletService.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    if (![template.outcomeA.providerOutcomeIndex, template.outcomeB.providerOutcomeIndex].includes(makerOutcomeIndex)) {
      throw httpError(400, 'INVALID_MAKER_OUTCOME');
    }
    const recipientEmail = recipient ? normalizeEmail(recipient) : null;
    if (recipientEmail === user.email) throw httpError(400, 'MAKER_CANNOT_INVITE_SELF');
    const takerAddress = recipientEmail ? ZERO_ADDRESS : taker ? this.chain.normalizeAddress(taker) : ZERO_ADDRESS;
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
      recipientEmail,
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
      offerSignature: null,
      makerPermit: null,
      makerAuthorizedAt: null,
      acceptancePayload: null,
      acceptanceSignature: null,
      takerPermit: null,
      takerAuthorizedAt: null,
      status: 'draft',
      betId: null,
      expiresAt: new Date(Number(deadline) * 1000),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveInvite(invite);
    return invite;
  }

  async authorizeMaker(user: UserAccount, inviteId: string, offerSignature: Hex, makerPermit: PermitData) {
    const invite = await this.repository.findInvite(inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.makerUserId !== user.id) throw httpError(403, 'INVITE_NOT_OWNED_BY_USER');
    if (invite.expiresAt <= new Date()) throw httpError(400, 'INVITE_EXPIRED');
    if (invite.status !== 'draft' && invite.status !== 'created') throw httpError(400, 'INVITE_NOT_DRAFT');

    const offer = inviteToOffer(invite);
    const offerOk = await verifyTypedData({
      address: invite.makerAddress,
      domain: this.chain.domain(),
      types: betOfferTypes,
      primaryType: 'BetOffer',
      message: offer,
      signature: offerSignature,
    });
    if (!offerOk) throw httpError(400, 'INVALID_OFFER_SIGNATURE');

    await this.verifyPermit(invite.makerAddress, makerPermit, invite, 'INVALID_MAKER_PERMIT');
    const now = new Date();
    invite.offerSignature = offerSignature;
    invite.makerPermit = toStoredPermit(makerPermit);
    invite.makerAuthorizedAt = now;
    invite.status = 'created';
    invite.updatedAt = now;
    await this.repository.saveInvite(invite);
    return invite;
  }

  async accept(user: UserAccount, inviteId: string, takerOutcomeIndex: number) {
    const invite = await this.repository.findInvite(inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.expiresAt <= new Date()) throw httpError(400, 'INVITE_EXPIRED');
    if (invite.status !== 'created') throw httpError(400, 'INVITE_NOT_OPEN');
    if (!invite.offerSignature || !invite.makerPermit || !invite.makerAuthorizedAt) throw httpError(400, 'INVITE_NOT_SHAREABLE');
    if (invite.recipientEmail && invite.recipientEmail !== user.email) throw httpError(403, 'INVITE_RECIPIENT_MISMATCH');
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
    invite.acceptanceSignature = null;
    invite.takerPermit = null;
    invite.takerAuthorizedAt = null;
    invite.status = 'accepted';
    invite.updatedAt = new Date();
    await this.repository.saveInvite(invite);
    return invite;
  }

  async authorizeTaker(user: UserAccount, inviteId: string, acceptanceSignature: Hex, takerPermit: PermitData) {
    const invite = await this.repository.findInvite(inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.expiresAt <= new Date()) throw httpError(400, 'INVITE_EXPIRED');
    if (invite.status !== 'accepted' || !invite.takerAddress || invite.takerOutcomeIndex === null || !invite.acceptancePayload) {
      throw httpError(400, 'INVITE_NOT_READY_FOR_TAKER_AUTHORIZATION');
    }
    if (invite.takerUserId !== user.id) throw httpError(403, 'INVITE_NOT_OWNED_BY_USER');
    const wallet = await this.walletService.activeWallet(user);
    if (!wallet || wallet.address !== invite.takerAddress) throw httpError(403, 'TAKER_WALLET_MISMATCH');

    if (!invite.acceptanceNonce) throw httpError(400, 'INVITE_NOT_READY_FOR_TAKER_AUTHORIZATION');
    const acceptance = {
      taker: invite.takerAddress,
      offerHash: invite.offerHash,
      takerOutcomeIndex: invite.takerOutcomeIndex,
      nonce: BigInt(String(invite.acceptanceNonce)),
      deadline: BigInt(Math.floor(invite.expiresAt.getTime() / 1000)),
    };
    const acceptanceOk = await verifyTypedData({
      address: invite.takerAddress,
      domain: this.chain.domain(),
      types: betAcceptanceTypes,
      primaryType: 'BetAcceptance',
      message: acceptance,
      signature: acceptanceSignature,
    });
    if (!acceptanceOk) throw httpError(400, 'INVALID_ACCEPTANCE_SIGNATURE');

    await this.verifyPermit(invite.takerAddress, takerPermit, invite, 'INVALID_TAKER_PERMIT');
    const now = new Date();
    invite.acceptanceSignature = acceptanceSignature;
    invite.takerPermit = toStoredPermit(takerPermit);
    invite.takerAuthorizedAt = now;
    invite.updatedAt = now;
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

  private async verifyPermit(owner: Address, permit: PermitData, invite: BetInvite, code: string) {
    const required = BigInt(invite.stake) + BigInt(invite.loserFee);
    const deadline = BigInt(Math.floor(invite.expiresAt.getTime() / 1000));
    if (permit.value !== required) throw httpError(400, 'PERMIT_VALUE_MISMATCH');
    if (permit.deadline !== deadline) throw httpError(400, 'PERMIT_DEADLINE_MISMATCH');
    const payload = await this.brl1.permitPayloadForData(owner, permit);
    const ok = await verifyTypedData({
      address: owner,
      domain: payload.domain,
      types: permitTypes,
      primaryType: 'Permit',
      message: {
        owner,
        spender: payload.message.spender as Address,
        value: permit.value,
        nonce: permit.nonce,
        deadline: permit.deadline,
      },
      signature: permitSignature(permit),
    });
    if (!ok) throw httpError(400, code);
  }
}

export function toStoredPermit(permit: PermitData): StoredPermit {
  const normalizedV = normalizePermitV(permit.v);
  return {
    value: permit.value.toString(),
    nonce: permit.nonce.toString(),
    deadline: permit.deadline.toString(),
    v: normalizedV,
    r: permit.r,
    s: permit.s,
  };
}

export function permitFromStored(permit: StoredPermit | null | undefined): PermitData | undefined {
  if (!permit) return undefined;
  return {
    value: BigInt(permit.value),
    nonce: BigInt(permit.nonce),
    deadline: BigInt(permit.deadline),
    v: permit.v,
    r: permit.r,
    s: permit.s,
  };
}

export function permitSignature(permit: PermitData): Hex {
  const normalizedV = normalizePermitV(permit.v);
  return `0x${permit.r.slice(2)}${permit.s.slice(2)}${normalizedV.toString(16).padStart(2, '0')}` as Hex;
}

function normalizePermitV(v: number): number {
  const normalizedV = v === 0 || v === 1 ? v + 27 : v;
  if (normalizedV !== 27 && normalizedV !== 28) throw httpError(400, 'INVALID_PERMIT_V');
  return normalizedV;
}
