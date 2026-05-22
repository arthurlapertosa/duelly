import { brlToRaw } from './format';
import type { Hex, WalletAdapter } from './types';

/** Preset stake amounts offered on the template detail screen. */
export const stakeOptions = [25, 50, 100, 250];

/** Connects the browser wallet and asserts it matches the linked address. */
export async function connectLinkedWallet(adapter: WalletAdapter, linkedAddress: Hex): Promise<Hex> {
  const address = await adapter.connect();
  if (address.toLowerCase() !== linkedAddress.toLowerCase()) throw new Error('WALLET_ACCOUNT_MISMATCH');
  return address;
}

/** Parses a free-text BRL amount (comma or dot decimals) into a raw BRL1 value. */
export function customStakeToRaw(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '');
  if (!cleaned) return '0';
  const decimalIndex = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  const normalized =
    decimalIndex >= 0
      ? `${cleaned.slice(0, decimalIndex).replace(/\D/g, '') || '0'}.${cleaned
          .slice(decimalIndex + 1)
          .replace(/\D/g, '')
          .slice(0, 2)}`
      : cleaned.replace(/\D/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? brlToRaw(amount) : '0';
}

/** Returns a same-origin path or null, guarding against open redirects. */
export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** Loose email validity check used for invite recipients. */
export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
