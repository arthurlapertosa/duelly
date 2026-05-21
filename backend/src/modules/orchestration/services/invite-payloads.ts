import { getAddress, type Address, type Hex } from 'viem';
import type { BetAcceptanceMessage, BetOfferMessage } from '../chain.js';
import type { BetInvite } from '../domain.js';
import { httpError } from './errors.js';

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

export function inviteToOffer(invite: BetInvite): BetOfferMessage {
  const message = typedPayloadMessage(invite.offerPayload, 'BetOffer');
  return {
    maker: addressValue(message, 'maker', invite.makerAddress),
    taker: addressValue(message, 'taker', ZERO_ADDRESS),
    templateHash: hexValue(message, 'templateHash', invite.templateHash),
    conditionId: hexValue(message, 'conditionId', invite.conditionId),
    makerOutcomeIndex: numberValue(message, 'makerOutcomeIndex', invite.makerOutcomeIndex),
    stake: bigintValue(message, 'stake', invite.stake),
    loserFee: bigintValue(message, 'loserFee', invite.loserFee),
    nonce: bigintValue(message, 'nonce', invite.offerNonce),
    deadline: bigintValue(message, 'deadline', Math.floor(invite.expiresAt.getTime() / 1000)),
  };
}

export function inviteToAcceptance(invite: BetInvite): BetAcceptanceMessage {
  if (!invite.takerAddress || invite.takerOutcomeIndex === null || !invite.acceptanceNonce) throw httpError(400, 'INVITE_NOT_ACCEPTED');
  const message = typedPayloadMessage(invite.acceptancePayload, 'BetAcceptance');
  return {
    taker: addressValue(message, 'taker', invite.takerAddress),
    offerHash: hexValue(message, 'offerHash', invite.offerHash),
    takerOutcomeIndex: numberValue(message, 'takerOutcomeIndex', invite.takerOutcomeIndex),
    nonce: bigintValue(message, 'nonce', invite.acceptanceNonce),
    deadline: bigintValue(message, 'deadline', Math.floor(invite.expiresAt.getTime() / 1000)),
  };
}

export function stringifyBigints<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
}

function typedPayloadMessage(value: unknown, primaryType: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const payload = value as Record<string, unknown>;
  if (payload.primaryType !== primaryType || !payload.message || typeof payload.message !== 'object') return undefined;
  return payload.message as Record<string, unknown>;
}

function addressValue(message: Record<string, unknown> | undefined, field: string, fallback: Address): Address {
  return getAddress(String(message?.[field] ?? fallback));
}

function hexValue(message: Record<string, unknown> | undefined, field: string, fallback: Hex): Hex {
  return String(message?.[field] ?? fallback) as Hex;
}

function numberValue(message: Record<string, unknown> | undefined, field: string, fallback: number): number {
  return Number(message?.[field] ?? fallback);
}

function bigintValue(message: Record<string, unknown> | undefined, field: string, fallback: string | number): bigint {
  return BigInt(String(message?.[field] ?? fallback));
}
