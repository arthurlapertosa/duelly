import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });

export type DiscoveryMode = 'fixture' | 'live';

export interface DatabaseConfig {
  enabled: boolean;
  url?: string;
  host?: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  serviceName: 'duelly-backend';
  database: DatabaseConfig;
  polymarket: {
    gammaBaseUrl: string;
    discoveryMode: DiscoveryMode;
    liveDiscoveryEnabled: boolean;
    timeoutMs: number;
    maxResults: number;
  };
  auth: {
    sessionTtlSeconds: number;
    walletChallengeTtlSeconds: number;
    mockAuthEnabled: boolean;
  };
  chain: {
    enabled: boolean;
    rpcUrl?: string;
    chainId: number;
    brl1Address?: `0x${string}`;
    escrowAddress?: `0x${string}`;
    polymarketCtfAddress?: `0x${string}`;
    deploymentBlock: bigint;
    relayerPrivateKey?: `0x${string}`;
    minLoserFeeWei: bigint;
    gasEstimateWei: bigint;
    gasMultiplier: number;
  };
}

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readDiscoveryMode(): DiscoveryMode {
  const raw = process.env.POLYMARKET_DISCOVERY_MODE ?? 'fixture';
  if (raw === 'fixture' || raw === 'live') return raw;
  throw new Error('POLYMARKET_DISCOVERY_MODE must be fixture or live');
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function readBigint(name: string, fallback: bigint): bigint {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    const parsed = BigInt(raw);
    if (parsed < 0n) throw new Error();
    return parsed;
  } catch {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function readAddress(name: string): `0x${string}` | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) throw new Error(`${name} must be a 0x-prefixed EVM address`);
  return raw as `0x${string}`;
}

function readPrivateKey(name: string): `0x${string}` | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const normalized = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) throw new Error(`${name} must be a 32-byte hex private key`);
  return normalized as `0x${string}`;
}

export function loadAppConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;
  const dbUsername = process.env.DB_USERNAME;
  const dbDatabase = process.env.DB_DATABASE;
  const explicitDbConfigEnabled = Boolean(dbHost && dbUsername && dbDatabase);

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: readInteger('PORT', 3000),
    host: process.env.HOST ?? '127.0.0.1',
    serviceName: 'duelly-backend',
    database: {
      enabled: Boolean(databaseUrl || explicitDbConfigEnabled),
      url: databaseUrl,
      host: dbHost,
      port: readInteger('DB_PORT', 5432),
      username: dbUsername,
      password: process.env.DB_PASSWORD,
      database: dbDatabase,
    },
    polymarket: {
      gammaBaseUrl: process.env.POLYMARKET_GAMMA_BASE_URL
        ?? process.env.POLYMARKET_GAMMA_API_URL
        ?? 'https://gamma-api.polymarket.com',
      discoveryMode: readDiscoveryMode(),
      liveDiscoveryEnabled: readBoolean('POLYMARKET_LIVE_DISCOVERY_ENABLED', false),
      timeoutMs: readInteger('POLYMARKET_DISCOVERY_TIMEOUT_MS', 8000),
      maxResults: readInteger('POLYMARKET_DISCOVERY_MAX_RESULTS', 25),
    },
    auth: {
      sessionTtlSeconds: readInteger('AUTH_SESSION_TTL_SECONDS', 7 * 24 * 60 * 60),
      walletChallengeTtlSeconds: readInteger('WALLET_CHALLENGE_TTL_SECONDS', 10 * 60),
      mockAuthEnabled: readBoolean('AUTH_MOCK_ENABLED', process.env.NODE_ENV === 'test'),
    },
    chain: {
      enabled: readBoolean('CHAIN_ENABLED', Boolean(process.env.CHAIN_RPC_URL || process.env.POLYGON_RPC_URL || process.env.EVM_RPC_URL)),
      rpcUrl: process.env.CHAIN_RPC_URL ?? process.env.EVM_RPC_URL ?? process.env.POLYGON_RPC_URL,
      chainId: readInteger('CHAIN_ID', readInteger('EVM_CHAIN_ID', 137)),
      brl1Address: readAddress('BRL1_TOKEN_ADDRESS') ?? readAddress('BRL1_ADDRESS_POLYGON'),
      escrowAddress: readAddress('DUELLY_ESCROW_ADDRESS'),
      polymarketCtfAddress: readAddress('POLYMARKET_CTF_ADDRESS'),
      deploymentBlock: readBigint('DUELLY_DEPLOYMENT_BLOCK', 0n),
      relayerPrivateKey: readPrivateKey('RELAYER_PRIVATE_KEY'),
      minLoserFeeWei: readBigint('MIN_LOSER_FEE_WEI', 0n),
      gasEstimateWei: readBigint('LOSER_FEE_GAS_ESTIMATE_WEI', 1_000_000_000_000_000_000n),
      gasMultiplier: readInteger('LOSER_FEE_GAS_MULTIPLIER', 3),
    },
  };
}
