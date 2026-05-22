import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INVITE_TTL_SECONDS, loadAppConfig } from '../../src/config/env.js';

const keys = [
  'PORT',
  'DATABASE_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'POLYMARKET_GAMMA_BASE_URL',
  'POLYMARKET_GAMMA_API_URL',
  'POLYMARKET_DISCOVERY_MODE',
  'POLYMARKET_ALLOW_NEG_RISK',
  'POLYMARKET_DISCOVERY_TIMEOUT_MS',
  'POLYMARKET_DISCOVERY_MAX_RESULTS',
  'INVITE_TTL_SECONDS',
  'RESOLUTION_WORKER_ENABLED',
  'RESOLUTION_WORKER_INTERVAL_MS',
  'RESOLUTION_WORKER_BATCH_SIZE',
  'RESOLUTION_WORKER_PENDING_RETRY_SECONDS',
  'NODE_ENV',
  'CORS_ORIGINS',
];

test('loadAppConfig supports explicit DB variables and fixture mode defaults', () => {
  const previous = snapshotEnv();
  try {
    for (const key of keys) delete process.env[key];
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'duelly';
    process.env.DB_PASSWORD = 'secret';
    process.env.DB_DATABASE = 'duelly_test';

    const config = loadAppConfig();

    assert.equal(config.database.enabled, true);
    assert.equal(config.database.port, 5432);
    assert.equal(config.polymarket.discoveryMode, 'fixture');
    assert.equal(config.polymarket.allowNegativeRisk, false);
    assert.equal(config.polymarket.gammaBaseUrl, 'https://gamma-api.polymarket.com');
    assert.equal(config.invites.ttlSeconds, DEFAULT_INVITE_TTL_SECONDS);
    assert.equal(config.resolutionWorker.enabled, false);
    assert.equal(config.resolutionWorker.intervalMs, 60_000);
    assert.equal(config.resolutionWorker.batchSize, 10);
    assert.equal(config.resolutionWorker.pendingRetrySeconds, 900);
    assert.deepEqual(config.cors.origins, ['http://localhost:5173', 'http://127.0.0.1:5173']);
  } finally {
    restoreEnv(previous);
  }
});

test('loadAppConfig supports staging negative-risk template opt-in', () => {
  const previous = snapshotEnv();
  try {
    for (const key of keys) delete process.env[key];
    process.env.POLYMARKET_ALLOW_NEG_RISK = 'true';

    const config = loadAppConfig();

    assert.equal(config.polymarket.allowNegativeRisk, true);
  } finally {
    restoreEnv(previous);
  }
});

test('loadAppConfig supports resolution worker settings', () => {
  const previous = snapshotEnv();
  try {
    for (const key of keys) delete process.env[key];
    process.env.RESOLUTION_WORKER_ENABLED = 'true';
    process.env.RESOLUTION_WORKER_INTERVAL_MS = '5000';
    process.env.RESOLUTION_WORKER_BATCH_SIZE = '3';
    process.env.RESOLUTION_WORKER_PENDING_RETRY_SECONDS = '30';

    const config = loadAppConfig();

    assert.equal(config.resolutionWorker.enabled, true);
    assert.equal(config.resolutionWorker.intervalMs, 5000);
    assert.equal(config.resolutionWorker.batchSize, 3);
    assert.equal(config.resolutionWorker.pendingRetrySeconds, 30);
  } finally {
    restoreEnv(previous);
  }
});

test('loadAppConfig requires explicit CORS origins in production', () => {
  const previous = snapshotEnv();
  try {
    for (const key of keys) delete process.env[key];
    process.env.NODE_ENV = 'production';

    assert.throws(() => loadAppConfig(), /CORS_ORIGINS/);

    process.env.CORS_ORIGINS = ',';
    assert.throws(() => loadAppConfig(), /CORS_ORIGINS/);

    process.env.CORS_ORIGINS = 'https://app.duelly.test,https://admin.duelly.test';
    const config = loadAppConfig();
    assert.deepEqual(config.cors.origins, ['https://app.duelly.test', 'https://admin.duelly.test']);
  } finally {
    restoreEnv(previous);
  }
});

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(previous: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
