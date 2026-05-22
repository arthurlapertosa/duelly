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

function liveRouteTestConfig() {
  const config = routeTestConfig();
  return {
    ...config,
    polymarket: {
      ...config.polymarket,
      discoveryMode: 'live' as const,
      liveDiscoveryEnabled: true,
      gammaBaseUrl: 'https://gamma.example.test',
      maxResults: 20,
      minBettingCloseBufferSeconds: 0,
      allowNegativeRisk: false,
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

test('template routes honor zero close buffer config', async () => {
  const config = routeTestConfig();
  const app = await createApp({
    config: {
      ...config,
      polymarket: {
        ...config.polymarket,
        minBettingCloseBufferSeconds: 0,
      },
    },
  });
  test.after(async () => app.close());

  const accepted = await app.inject({ method: 'GET', url: '/templates?mode=fixture' });

  assert.equal(accepted.statusCode, 200);
  assert.equal(
    accepted.json().templates.some((template: { templateId: string }) => template.templateId === 'fixture-near-expiry-rejected'),
    true,
  );
});

test('template routes return accepted mocked live tennis and UFC templates', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/events' && url.searchParams.get('series_slug') === 'atp') {
      return jsonResponse([
        gammaEvent({
          id: 'live-tennis-event',
          title: 'Geneva Open: Learner Tien vs Alexander Bublik',
          tags: [{ slug: 'tennis', label: 'Tennis' }],
          series: [{ slug: 'atp', ticker: 'ATP', title: 'ATP' }],
          markets: [
            gammaMarket({
              id: 'live-tennis-market',
              slug: 'geneva-open-learner-tien-vs-alexander-bublik',
              question: 'Geneva Open: Learner Tien vs Alexander Bublik',
              rules: 'This market resolves to the official match winner. If there is a retirement, walkover, cancellation, or no contest, this market resolves 50-50.',
              conditionSeed: 'live-tennis-market',
              questionSeed: 'live-tennis-market-question',
              outcomes: ['Learner Tien', 'Alexander Bublik'],
            }),
          ],
        }),
      ]);
    }
    if (url.pathname === '/events' && url.searchParams.get('tag_slug') === 'ufc') {
      return jsonResponse([
        gammaEvent({
          id: 'live-ufc-event',
          title: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo (Bantamweight, Main Card)',
          description: 'This market resolves to the official winner of this fight at UFC Fight Night: Song vs. Figueiredo.',
          tags: [{ slug: 'ufc', label: 'UFC' }],
          markets: [
            gammaMarket({
              id: 'live-ufc-market',
              slug: 'ufc-fight-night-song-yadong-vs-deiveson-figueiredo',
              question: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo',
              rules: 'This market resolves to the official fight winner.',
              conditionSeed: 'live-ufc-market',
              questionSeed: 'live-ufc-market-question',
              outcomes: ['Song Yadong', 'Deiveson Figueiredo'],
            }),
          ],
        }),
      ]);
    }
    return jsonResponse([]);
  };

  const app = await createApp({
    config: liveRouteTestConfig(),
  });

  try {
    const tennis = await app.inject({ method: 'GET', url: '/templates?mode=live&sport=tennis' });
    assert.equal(tennis.statusCode, 200);
    assert.equal(tennis.json().count, 1);
    assert.equal(tennis.json().templates[0].sport, 'tennis');
    assert.equal(tennis.json().templates[0].competition, 'ATP_250');

    const ufc = await app.inject({ method: 'GET', url: '/templates?mode=live&sport=ufc' });
    assert.equal(ufc.statusCode, 200);
    assert.equal(ufc.json().count, 1);
    assert.equal(ufc.json().templates[0].sport, 'ufc');
    assert.equal(ufc.json().templates[0].eventType, 'MAIN_EVENT');
  } finally {
    await app.close();
    globalThis.fetch = previousFetch;
  }
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200 });
}

function gammaEvent(input: {
  id: string;
  title: string;
  description?: string;
  tags: unknown[];
  series?: unknown[];
  markets: unknown[];
}) {
  return {
    id: input.id,
    slug: input.id,
    title: input.title,
    description: input.description,
    tags: input.tags,
    series: input.series ?? [],
    active: true,
    closed: false,
    archived: false,
    negRisk: false,
    endDate: '2026-06-01T00:00:00.000Z',
    startTime: '2026-05-25T00:00:00.000Z',
    markets: input.markets,
  };
}

function gammaMarket(input: {
  id: string;
  slug: string;
  question: string;
  rules: string;
  conditionSeed: string;
  questionSeed: string;
  outcomes: string[];
}) {
  return {
    id: input.id,
    slug: input.slug,
    question: input.question,
    rules: input.rules,
    conditionId: bytes32(input.conditionSeed),
    questionID: bytes32(input.questionSeed),
    outcomes: input.outcomes,
    clobTokenIds: ['100', '200'],
    active: true,
    closed: false,
    archived: false,
    acceptingOrders: true,
    negRisk: false,
    endDate: '2026-06-01T00:00:00.000Z',
    startDate: '2026-05-25T00:00:00.000Z',
  };
}

function bytes32(seed: string): string {
  return `0x${Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64)}`;
}
