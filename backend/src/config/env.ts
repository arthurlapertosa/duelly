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
  };
}
