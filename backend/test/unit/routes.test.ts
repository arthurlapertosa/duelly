import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { loadAppConfig } from '../../src/config/env.js';

function routeTestConfig() {
  const config = loadAppConfig();
  return {
    ...config,
    nodeEnv: 'test',
    database: { enabled: false, port: 5432 },
    polymarket: {
      ...config.polymarket,
      discoveryMode: 'fixture' as const,
      liveDiscoveryEnabled: false,
    },
  };
}

test('health and readiness routes work without database configuration', async () => {
  const app = await createApp({
    config: routeTestConfig(),
  });
  test.after(async () => app.close());

  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().service, 'duelly-backend');

  const ready = await app.inject({ method: 'GET', url: '/ready' });
  assert.equal(ready.statusCode, 200);
  assert.equal(ready.json().database, 'disabled');
});

test('CORS allows configured frontend origins and preflight requests', async () => {
  const app = await createApp({
    config: {
      ...routeTestConfig(),
      cors: { origins: ['http://localhost:5173'] },
    },
  });
  test.after(async () => app.close());

  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/auth/me',
    headers: { origin: 'http://localhost:5173' },
  });
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.match(String(preflight.headers['access-control-allow-headers']), /authorization/);
  assert.match(String(preflight.headers['access-control-allow-methods']), /DELETE/);

  const disallowed = await app.inject({
    method: 'OPTIONS',
    url: '/auth/me',
    headers: { origin: 'https://example.invalid' },
  });
  assert.equal(disallowed.statusCode, 204);
  assert.equal(disallowed.headers['access-control-allow-origin'], undefined);
});

test('template routes expose fixture candidates, accepted templates, rejected candidates, and publisher payloads', async () => {
  const app = await createApp({
    config: routeTestConfig(),
  });
  test.after(async () => app.close());

  const candidates = await app.inject({ method: 'GET', url: '/templates/candidates?mode=fixture&sport=f1' });
  assert.equal(candidates.statusCode, 200);
  assert.equal(candidates.json().count, 4);

  const accepted = await app.inject({ method: 'GET', url: '/templates?mode=fixture&sport=f1' });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().count, 2);
  assert.match(accepted.json().templates[0].templateHash, /^0x[0-9a-f]{64}$/);

  const rejected = await app.inject({ method: 'GET', url: '/templates/rejected?mode=fixture&sport=f1' });
  assert.equal(rejected.statusCode, 200);
  assert.equal(rejected.json().count, 2);
  assert.equal(
    rejected.json().rejected.some((item: { reasons: string[] }) => item.reasons.includes('DISALLOWED_F1_MARKET_TYPE')),
    true,
  );

  const publishAccepted = await app.inject({
    method: 'POST',
    url: '/templates/publish?mode=fixture',
    payload: { templateId: 'fixture-f1-sprint-winner' },
  });
  assert.equal(publishAccepted.statusCode, 503);
  assert.equal(publishAccepted.json().code, 'PUBLISH_AUDIT_DB_REQUIRED');

  const liveDiscovery = await app.inject({ method: 'GET', url: '/templates/candidates?mode=live' });
  assert.equal(liveDiscovery.statusCode, 403);
  assert.equal(liveDiscovery.json().code, 'LIVE_DISCOVERY_DISABLED');
});
