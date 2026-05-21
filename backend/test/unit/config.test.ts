import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../../src/config/env.js';

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
  'POLYMARKET_DISCOVERY_TIMEOUT_MS',
  'POLYMARKET_DISCOVERY_MAX_RESULTS',
  'INVITE_TTL_SECONDS',
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
    assert.equal(config.polymarket.gammaBaseUrl, 'https://gamma-api.polymarket.com');
    assert.equal(config.invites.ttlSeconds, 3600);
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
