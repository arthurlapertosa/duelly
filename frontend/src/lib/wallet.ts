import { parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
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

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

/**
 * QA-only wallet mode. When VITE_QA_WALLET=true the app signs with local
 * private keys instead of an injected wallet, so http mode can be driven
 * end-to-end by Playwright without a browser extension. Never enable in prod:
 * the keys would be bundled into client JS.
 */
function qaWalletEnabled(): boolean {
  return viteEnv.VITE_QA_WALLET === 'true' && Boolean(viteEnv.VITE_QA_MAKER_PRIVATE_KEY);
}

export function createWalletAdapter(mode: ApiMode): WalletAdapter {
  if (qaWalletEnabled()) return createQaWalletAdapter();
  if (mode === 'fixture') return createFixtureWalletAdapter();
  return createInjectedWalletAdapter();
}

function createFixtureWalletAdapter(): WalletAdapter {
  const connect = async () => {
    const email = window.localStorage.getItem('duelly-last-email') ?? '';
    return email.includes('taker') || email.includes('opponent')
      ? '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      : '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  };

  return {
    label: 'fixture',
    connect,
    selectAccount: connect,
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

function normalizePrivateKey(raw: string): Hex {
  const trimmed = raw.trim();
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as Hex;
}

/**
 * Picks the maker or taker QA key from the last logged-in email, mirroring the
 * fixture adapter so two-user flows resolve to two distinct on-chain wallets.
 */
function createQaWalletAdapter(): WalletAdapter {
  const resolveAccount = () => {
    const email = window.localStorage.getItem('duelly-last-email') ?? '';
    const isTaker = email.includes('taker') || email.includes('opponent');
    const key = isTaker ? viteEnv.VITE_QA_TAKER_PRIVATE_KEY : viteEnv.VITE_QA_MAKER_PRIVATE_KEY;
    if (!key) throw new Error('QA_WALLET_KEY_MISSING');
    return privateKeyToAccount(normalizePrivateKey(key));
  };

  return {
    label: 'qa',
    async connect() {
      return resolveAccount().address;
    },
    async selectAccount() {
      return resolveAccount().address;
    },
    async signMessage(_address, message) {
      return resolveAccount().signMessage({ message });
    },
    async signTypedData(_address, payload) {
      return resolveAccount().signTypedData(viemTypedPayload(payload));
    },
    async signPermit(address, payload) {
      const signature = await this.signTypedData(address, payload);
      return permitFromSignature(signature, payload);
    },
  };
}

/**
 * Converts a backend EIP-712 payload into the shape viem expects: integer
 * fields as BigInt, and no EIP712Domain entry in `types` (viem derives it).
 */
function viemTypedPayload(payload: TypedPayload): {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
} {
  const types: Record<string, Array<{ name: string; type: string }>> = {};
  const integerFields = new Set<string>();
  for (const [name, fields] of Object.entries(payload.types)) {
    if (name === 'EIP712Domain') continue;
    types[name] = fields;
    for (const field of fields) {
      if (/^u?int\d*$/.test(field.type)) integerFields.add(field.name);
    }
  }
  const message: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload.message)) {
    message[key] = integerFields.has(key) && typeof value !== 'bigint' ? BigInt(value as string) : value;
  }
  return { domain: payload.domain, types, primaryType: payload.primaryType, message };
}

function createInjectedWalletAdapter(): WalletAdapter {
  return {
    label: 'injected',
    async connect() {
      const provider = requireProvider();
      return await requestAccount(provider);
    },
    async selectAccount() {
      const provider = requireProvider();
      await provider.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      return await requestAccount(provider);
    },
    async signMessage(address, message) {
      const provider = requireProvider();
      return await provider.request<Hex>({ method: 'personal_sign', params: [message, address] });
    },
    async signTypedData(address, payload) {
      const provider = requireProvider();
      return await provider.request<Hex>({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(metaMaskTypedPayload(payload))],
      });
    },
    async signPermit(address, payload) {
      const signature = await this.signTypedData(address, payload);
      return permitFromSignature(signature, payload);
    },
  };
}

async function requestAccount(provider: Eip1193Provider): Promise<Hex> {
  const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  if (!account?.startsWith('0x')) throw new Error('NO_WALLET_ACCOUNT');
  return account as Hex;
}

export function metaMaskTypedPayload(payload: TypedPayload): TypedPayload {
  if (payload.types.EIP712Domain) return payload;
  const domainTypes = eip712DomainTypes(payload.domain);
  if (domainTypes.length === 0) return payload;
  return {
    ...payload,
    types: {
      EIP712Domain: domainTypes,
      ...payload.types,
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

function eip712DomainTypes(domain: Record<string, unknown>): Array<{ name: string; type: string }> {
  return [
    ['name', 'string'],
    ['version', 'string'],
    ['chainId', 'uint256'],
    ['verifyingContract', 'address'],
    ['salt', 'bytes32'],
  ].flatMap(([name, type]) => domain[name] === undefined ? [] : [{ name, type }]);
}
