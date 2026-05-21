import type { FastifyReply } from 'fastify';
import type { Address, Hex } from 'viem';
import type { UserAccount } from '../../modules/orchestration/domain.js';
import { httpError } from '../../modules/orchestration/services.js';
import type { CanonicalSportsTemplate } from '../../modules/templates/domain/types.js';
import type { OrchestrationControllerContext } from './orchestration-controller.context.js';

export async function findTemplate(
  context: OrchestrationControllerContext,
  id: string,
  query: Record<string, unknown>,
): Promise<CanonicalSportsTemplate | undefined> {
  const result = await context.templates.discoverAndFilter(query);
  return result.accepted.find((template) => template.templateId === id || template.templateHash.toLowerCase() === id.toLowerCase());
}

export async function wrap(reply: FastifyReply, handler: () => Promise<unknown>) {
  try {
    const result = await handler();
    if (result === undefined) return;
    return result;
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    reply.code(statusCode);
    return {
      status: 'error',
      code: (error as { code?: string }).code ?? (error instanceof Error ? error.message : 'INTERNAL_ERROR'),
    };
  }
}

export function publicUser(user: UserAccount) {
  return {
    id: user.id,
    displayIdentifier: user.displayIdentifier,
    externalWalletLinked: false,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function publicWallet(wallet: { address: Address; chainId: number; active: boolean; verifiedAt: Date }) {
  return {
    address: wallet.address,
    chainId: wallet.chainId,
    verificationStatus: wallet.active ? 'verified' : 'inactive',
    verifiedAt: wallet.verifiedAt.toISOString(),
  };
}

export function publicInvite(invite: { id: string; status: string; templateHash: Hex; conditionId: Hex; makerAddress: Address; takerAddress: Address | null; makerOutcomeIndex: number; takerOutcomeIndex: number | null; stake: string; loserFee: string; expiresAt: Date; betId: string | null }) {
  return {
    id: invite.id,
    status: invite.status,
    templateHash: invite.templateHash,
    conditionId: invite.conditionId,
    makerAddress: invite.makerAddress,
    takerAddress: invite.takerAddress,
    makerOutcomeIndex: invite.makerOutcomeIndex,
    takerOutcomeIndex: invite.takerOutcomeIndex,
    stakeRaw: invite.stake,
    loserFeeRaw: invite.loserFee,
    expiresAt: invite.expiresAt.toISOString(),
    betId: invite.betId,
  };
}

export function objectBody(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function objectField(value: Record<string, unknown>, field: string): Record<string, unknown> {
  const item = value[field];
  if (!item || typeof item !== 'object') throw httpError(400, `MISSING_${field.toUpperCase()}`);
  return item as Record<string, unknown>;
}

export function arrayField(value: Record<string, unknown>, field: string): unknown[] {
  const item = value[field];
  if (!Array.isArray(item)) throw httpError(400, `MISSING_${field.toUpperCase()}`);
  return item;
}

export function stringField(value: Record<string, unknown>, field: string): string {
  const item = value[field];
  if (typeof item !== 'string' || item.length === 0) throw httpError(400, `MISSING_${field.toUpperCase()}`);
  return item;
}

export function optionalString(value: Record<string, unknown>, field: string): string | undefined {
  const item = value[field];
  return typeof item === 'string' && item.length > 0 ? item : undefined;
}

export function numberField(value: Record<string, unknown>, field: string): number {
  const item = value[field];
  const parsed = typeof item === 'number' ? item : Number.parseInt(String(item), 10);
  if (!Number.isFinite(parsed)) throw httpError(400, `INVALID_${field.toUpperCase()}`);
  return parsed;
}

export function bigintField(value: Record<string, unknown>, field: string): bigint {
  const item = value[field];
  try {
    const parsed = BigInt(String(item));
    if (parsed < 0n) throw new Error();
    return parsed;
  } catch {
    throw httpError(400, `INVALID_${field.toUpperCase()}`);
  }
}

export function permitField(value: Record<string, unknown>) {
  return {
    value: bigintField(value, 'value'),
    nonce: bigintField(value, 'nonce'),
    deadline: bigintField(value, 'deadline'),
    v: numberField(value, 'v'),
    r: stringField(value, 'r') as Hex,
    s: stringField(value, 's') as Hex,
  };
}
