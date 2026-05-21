import { parseSignature } from 'viem';
import type { ApiMode, Hex, PermitSubmission, TypedPayload, WalletAdapter } from './types';

interface Eip1193Provider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const fixtureSignature = `0x${'11'.repeat(65)}` as Hex;

export function createWalletAdapter(mode: ApiMode): WalletAdapter {
  if (mode === 'fixture') return createFixtureWalletAdapter();
  return createInjectedWalletAdapter();
}

function createFixtureWalletAdapter(): WalletAdapter {
  return {
    label: 'fixture',
    async connect() {
      const email = window.localStorage.getItem('duelly-last-email') ?? '';
      return email.includes('taker') || email.includes('opponent')
        ? '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
        : '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    },
    async signMessage() {
      return fixtureSignature;
    },
    async signTypedData() {
      return fixtureSignature;
    },
    async signPermit(_address, payload) {
      return {
        value: String(payload.message.value),
        nonce: String(payload.message.nonce),
        deadline: String(payload.message.deadline),
        v: 27,
        r: `0x${'22'.repeat(32)}`,
        s: `0x${'33'.repeat(32)}`,
      };
    },
  };
}

function createInjectedWalletAdapter(): WalletAdapter {
  return {
    label: 'injected',
    async connect() {
      const provider = requireProvider();
      const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      if (!account?.startsWith('0x')) throw new Error('NO_WALLET_ACCOUNT');
      return account as Hex;
    },
    async signMessage(address, message) {
      const provider = requireProvider();
      return await provider.request<Hex>({ method: 'personal_sign', params: [message, address] });
    },
    async signTypedData(address, payload) {
      const provider = requireProvider();
      return await provider.request<Hex>({ method: 'eth_signTypedData_v4', params: [address, JSON.stringify(payload)] });
    },
    async signPermit(address, payload) {
      const signature = await this.signTypedData(address, payload);
      return permitFromSignature(signature, payload);
    },
  };
}

function requireProvider(): Eip1193Provider {
  if (!window.ethereum) throw new Error('WALLET_PROVIDER_NOT_FOUND');
  return window.ethereum;
}

function permitFromSignature(signature: Hex, payload: TypedPayload): PermitSubmission {
  const parsed = parseSignature(signature);
  return {
    value: String(payload.message.value),
    nonce: String(payload.message.nonce),
    deadline: String(payload.message.deadline),
    v: Number(parsed.v),
    r: parsed.r,
    s: parsed.s,
  };
}
