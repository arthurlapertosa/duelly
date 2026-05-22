import { config as loadDotenv } from 'dotenv';
import { getAddress, isAddress, type Address, type Hex } from 'viem';
import {
  DEFAULT_MIN_BETTING_CLOSE_BUFFER_HOURS,
  DEFAULT_MIN_BETTING_CLOSE_BUFFER_SECONDS,
} from '../modules/templates/domain/sports-policy.js';

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
  cors: {
    origins: string[];
  };
  database: DatabaseConfig;
  polymarket: {
    gammaBaseUrl: string;
    discoveryMode: DiscoveryMode;
    liveDiscoveryEnabled: boolean;
    allowNegativeRisk: boolean;
    minBettingCloseBufferSeconds: number;
    timeoutMs: number;
    maxResults: number;
  };
  auth: {
    sessionTtlSeconds: number;
    walletChallengeTtlSeconds: number;
    mockAuthEnabled: boolean;
  };
  invites: {
    ttlSeconds: number;
  };
  resolutionWorker: {
    enabled: boolean;
    intervalMs: number;
    batchSize: number;
    pendingRetrySeconds: number;
  };
  polymarketResolutionMirror: {
    enabled: boolean;
    sourceRpcUrl?: string;
    oracleAddress?: Address;
    outcomeSlotCount: number;
    allowNonLocalForkRpc: boolean;
  };
  chain: {
    enabled: boolean;
    rpcUrl?: string;
    chainId: number;
    brl1Address?: Address;
    escrowAddress?: Address;
    polymarketCtfAddress?: Address;
    deploymentBlock: bigint;
    relayerPrivateKey?: Hex;
    minLoserFeeWei: bigint;
    gasEstimateWei: bigint;
    gasMultiplier: number;
  };
}

export const DEFAULT_INVITE_TTL_SECONDS = 365 * 24 * 60 * 60;

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readNonNegativeInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

function readTemplateCloseBufferSeconds(): number {
  if (process.env.POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS !== undefined) {
    return readNonNegativeInteger(
      'POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS',
      DEFAULT_MIN_BETTING_CLOSE_BUFFER_HOURS,
    ) * 60 * 60;
  }
  return readNonNegativeInteger(
    'POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS',
    DEFAULT_MIN_BETTING_CLOSE_BUFFER_SECONDS,
  );
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

function readOptionalString(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw ? raw : undefined;
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

function readAddress(name: string): Address | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  if (!isAddress(raw)) throw new Error(`${name} must be a 0x-prefixed EVM address`);
  return getAddress(raw);
}

function readPrivateKey(name: string): Hex | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const normalized = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) throw new Error(`${name} must be a 32-byte hex private key`);
  return normalized as Hex;
}

function readCorsOrigins(nodeEnv: string): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) {
    if (nodeEnv === 'production') throw new Error('CORS_ORIGINS must be configured in production');
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  const origins = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (nodeEnv === 'production' && origins.length === 0) throw new Error('CORS_ORIGINS must include at least one origin in production');
  return origins;
}

export function loadAppConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;
  const dbUsername = process.env.DB_USERNAME;
  const dbDatabase = process.env.DB_DATABASE;
  const explicitDbConfigEnabled = Boolean(dbHost && dbUsername && dbDatabase);
  const resolutionMirrorEnabled = readBoolean('POLYMARKET_RESOLUTION_MIRROR_ENABLED', false);

  return {
    nodeEnv,
    port: readInteger('PORT', 3000),
    host: process.env.HOST ?? '127.0.0.1',
    serviceName: 'duelly-backend',
    cors: {
      origins: readCorsOrigins(nodeEnv),
    },
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
      allowNegativeRisk: readBoolean('POLYMARKET_ALLOW_NEG_RISK', false),
      minBettingCloseBufferSeconds: readTemplateCloseBufferSeconds(),
      timeoutMs: readInteger('POLYMARKET_DISCOVERY_TIMEOUT_MS', 8000),
      maxResults: readInteger('POLYMARKET_DISCOVERY_MAX_RESULTS', 25),
    },
    auth: {
      sessionTtlSeconds: readInteger('AUTH_SESSION_TTL_SECONDS', 7 * 24 * 60 * 60),
      walletChallengeTtlSeconds: readInteger('WALLET_CHALLENGE_TTL_SECONDS', 10 * 60),
      mockAuthEnabled: readBoolean('AUTH_MOCK_ENABLED', process.env.NODE_ENV === 'test'),
    },
    invites: {
      ttlSeconds: readInteger('INVITE_TTL_SECONDS', DEFAULT_INVITE_TTL_SECONDS),
    },
    resolutionWorker: {
      enabled: readBoolean('RESOLUTION_WORKER_ENABLED', false),
      intervalMs: readInteger('RESOLUTION_WORKER_INTERVAL_MS', 60_000),
      batchSize: readInteger('RESOLUTION_WORKER_BATCH_SIZE', 10),
      pendingRetrySeconds: readInteger('RESOLUTION_WORKER_PENDING_RETRY_SECONDS', 15 * 60),
    },
    polymarketResolutionMirror: {
      enabled: resolutionMirrorEnabled,
      sourceRpcUrl: readOptionalString('POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL') ?? readOptionalString('POLYGON_RPC_URL'),
      oracleAddress: readAddress('POLYMARKET_CTF_ORACLE_ADDRESS'),
      outcomeSlotCount: readInteger('POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT', 2),
      allowNonLocalForkRpc: readBoolean('POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC', false),
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
