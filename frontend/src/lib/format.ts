import type { Locale } from './types';

export const BRL1_DECIMALS = 18n;
export const BRL1_BASE = 10n ** BRL1_DECIMALS;

export function brlToRaw(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '0';
  return (BigInt(Math.round(amount * 100)) * BRL1_BASE / 100n).toString();
}

export function rawToNumber(raw: string, decimals = 18): number {
  const value = BigInt(raw || '0');
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  return Number(whole) + Number(fraction) / Number(base);
}

export function formatBRL(raw: string, locale: Locale, decimals = 18): string {
  return rawToNumber(raw, decimals).toLocaleString(locale, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export function potentialPayoutRaw(stakeRaw: string, loserFeeRaw: string): string {
  return (BigInt(stakeRaw) * 2n + BigInt(loserFeeRaw)).toString();
}
