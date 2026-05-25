import { ApiError } from './api';
import { translate } from './i18n';
import type { Locale } from './types';

export const knownErrorCodes = [
  'AUTH_FAILED',
  'BET_NOT_FOUND',
  'BET_NOT_INDEXED',
  'CONDITION_RESOLVED',
  'EMAIL_ALREADY_REGISTERED',
  'INTERNAL_ERROR',
  'INVALID_ACCEPTANCE_SIGNATURE',
  'INVALID_CREDENTIALS',
  'INVALID_EMAIL',
  'INVALID_FIELD',
  'INVALID_LOSER_FEE_BPS',
  'INVALID_MAKER_OUTCOME',
  'INVALID_MAKER_PERMIT',
  'INVALID_OFFER_SIGNATURE',
  'INVALID_PERMIT_V',
  'INVALID_SIGNATURE',
  'INVALID_STAKE',
  'INVALID_STORED_PERMIT',
  'INVALID_TAKER_PERMIT',
  'INVITE_EXPIRED',
  'INVITE_NOT_ACCEPTED',
  'INVITE_NOT_DRAFT',
  'INVITE_NOT_FOUND',
  'INVITE_NOT_OPEN',
  'INVITE_NOT_OWNED_BY_USER',
  'INVITE_NOT_READY_FOR_FUNDING',
  'INVITE_NOT_READY_FOR_TAKER_AUTHORIZATION',
  'INVITE_NOT_SHAREABLE',
  'INVITE_RECIPIENT_MISMATCH',
  'LIVE_DISCOVERY_DISABLED',
  'LOSER_FEE_MISMATCH',
  'MAKER_CANNOT_ACCEPT_OWN_INVITE',
  'MAKER_CANNOT_INVITE_SELF',
  'MISSING_FIELD',
  'MISSING_MAKER_AUTHORIZATION',
  'MISSING_TAKER_AUTHORIZATION',
  'MISSING_TEMPLATE_ID',
  'NETWORK_ERROR',
  'NO_WALLET_ACCOUNT',
  'PASSWORD_TOO_SHORT',
  'PERMIT_DEADLINE_MISMATCH',
  'PERMIT_VALUE_MISMATCH',
  'PUBLISH_AUDIT_DB_REQUIRED',
  'PUBLISH_LIVE_DISABLED',
  'PUBLISH_STUB_DISABLED',
  'QA_WALLET_KEY_MISSING',
  'RELAYER_ATTEMPT_NOT_FOUND',
  'RELAYER_PRIVATE_KEY_NOT_CONFIGURED',
  'RESOLUTION_ATTEMPT_NOT_FOUND',
  'TAKER_OUTCOME_MUST_DIFFER',
  'TAKER_WALLET_MISMATCH',
  'TEMPLATE_CLOSED',
  'TEMPLATE_NOT_ACCEPTED',
  'TEMPLATE_NOT_FOUND',
  'TEMPLATE_NOT_REGISTERED_ON_CHAIN',
  'TEMPLATE_NOT_PUBLISHABLE',
  'TEMPLATE_REGISTRATION_FAILED',
  'TRANSACTION_REVERTED',
  'UNAUTHENTICATED',
  'UNAUTHORIZED_TAKER',
  'UNKNOWN_ERROR',
  'USER_REJECTED',
  'WALLET_ALREADY_LINKED',
  'WALLET_ACCOUNT_MISMATCH',
  'WALLET_ACCOUNT_NOT_AUTHORIZED',
  'WALLET_CHALLENGE_EXPIRED',
  'WALLET_CHALLENGE_NOT_FOUND',
  'WALLET_CHALLENGE_REPLAYED',
  'WALLET_CHAIN_MISMATCH',
  'WALLET_NOT_LINKED',
  'WALLET_PROVIDER_NOT_FOUND',
  'WALLET_SIGNATURE_MISMATCH',
  'WALLET_VERIFICATION_FAILED',
] as const;

export type KnownErrorCode = typeof knownErrorCodes[number];

const knownErrorCodeSet = new Set<string>(knownErrorCodes);
const rejectedCodes = new Set(['4001', 'ACTION_REJECTED', 'USER_REJECTED_REQUEST']);

export function errorCodeFrom(error: unknown): string {
  if (error instanceof ApiError) return normalizeCode(error.code);
  if (isProviderRejected(error)) return 'USER_REJECTED';
  if (isProviderUnauthorized(error)) return 'WALLET_ACCOUNT_NOT_AUTHORIZED';
  if (error instanceof TypeError) return 'NETWORK_ERROR';
  if (error instanceof Error && error.message) return normalizeCode(error.message);
  if (typeof error === 'string') return normalizeCode(error);
  return 'UNKNOWN_ERROR';
}

export function errorMessage(locale: Locale, error: unknown): string {
  const code = errorCodeFrom(error);
  const key = errorKeyFor(code);
  const message = translate(locale, key);
  return message === key ? translate(locale, 'error.UNKNOWN_ERROR') : message;
}

export function errorKeyFor(code: string): string {
  if (knownErrorCodeSet.has(code)) return `error.${code}`;
  if (code.startsWith('MISSING_')) return 'error.MISSING_FIELD';
  if (code.startsWith('INVALID_')) return 'error.INVALID_FIELD';
  return 'error.UNKNOWN_ERROR';
}

function normalizeCode(value: string): string {
  const code = value.trim();
  if (!code) return 'UNKNOWN_ERROR';
  if (knownErrorCodeSet.has(code)) return code;
  if (code === 'SIGN_REJECTED') return 'USER_REJECTED';
  if (/user rejected|user denied|request rejected|cancelled|canceled/i.test(code)) return 'USER_REJECTED';
  if (/not been authorized|not authorized|unauthorized account/i.test(code)) return 'WALLET_ACCOUNT_NOT_AUTHORIZED';
  if (/relayer private key is not configured/i.test(code)) return 'RELAYER_PRIVATE_KEY_NOT_CONFIGURED';
  if (/failed to fetch|networkerror|load failed/i.test(code)) return 'NETWORK_ERROR';
  return code;
}

function isProviderRejected(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = String((error as { code?: unknown }).code ?? '');
  return rejectedCodes.has(code);
}

function isProviderUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = String((error as { code?: unknown }).code ?? '');
  const message = String((error as { message?: unknown }).message ?? '');
  return code === '4100' || /not been authorized|not authorized/i.test(message);
}
