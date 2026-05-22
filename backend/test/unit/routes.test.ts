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
  assert.equal(accepted.json().templates[0].display.ptBR.outcomes[0], 'Sim');
  assert.match(accepted.json().templates[0].display.ptBR.rulesSummary, /classificação oficial/);

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
          startTime: '2099-05-25T14:00:00.000Z',
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
              closed: true,
              acceptingOrders: false,
            }),
          ],
        }),
        gammaEvent({
          id: 'live-hamburg-event',
          title: 'Hamburg European Open: Alex de Minaur vs Tommy Paul',
          startTime: '2099-05-25T15:30:00.000Z',
          tags: [{ slug: 'tennis', label: 'Tennis' }],
          series: [{ slug: 'atp', ticker: 'ATP', title: 'ATP' }],
          markets: [
            gammaMarket({
              id: 'live-hamburg-market',
              slug: 'hamburg-european-open-alex-de-minaur-vs-tommy-paul',
              question: 'Hamburg European Open: Alex de Minaur vs Tommy Paul',
              rules: 'This market resolves to the official match winner. If there is a retirement, walkover, cancellation, or no contest, this market resolves 50-50.',
              conditionSeed: 'live-hamburg-market',
              questionSeed: 'live-hamburg-market-question',
              outcomes: ['Alex de Minaur', 'Tommy Paul'],
            }),
          ],
        }),
        gammaEvent({
          id: 'started-roland-garros-event',
          title: 'Roland Garros, Qualification ATP: Thomas Faurel vs Jay Clarke',
          startTime: '2020-05-20T08:00:00.000Z',
          tags: [{ slug: 'tennis', label: 'Tennis' }],
          series: [{ slug: 'atp', ticker: 'ATP', title: 'ATP' }],
          markets: [
            gammaMarket({
              id: 'started-roland-garros-market',
              slug: 'roland-garros-qualification-atp-thomas-faurel-vs-jay-clarke',
              question: 'Roland Garros, Qualification ATP: Thomas Faurel vs Jay Clarke',
              rules: 'This market resolves to the official match winner. If there is a retirement, walkover, cancellation, or no contest, this market resolves 50-50.',
              conditionSeed: 'started-roland-garros-market',
              questionSeed: 'started-roland-garros-market-question',
              outcomes: ['Thomas Faurel', 'Jay Clarke'],
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
    const tennisBody = tennis.json();
    assert.equal(tennisBody.count, 3);
    assert.deepEqual(
      tennisBody.templates.map((template: { providerMarketId: string }) => template.providerMarketId).sort(),
      ['live-hamburg-market', 'live-tennis-market', 'started-roland-garros-market'],
    );
    assert.deepEqual(
      tennisBody.templates.map((template: { competition: string }) => template.competition).sort(),
      ['ATP_250', 'ATP_500', 'GRAND_SLAM'],
    );
    const geneva = tennisBody.templates.find(
      (template: { providerMarketId: string }) => template.providerMarketId === 'live-tennis-market',
    );
    assert.ok(geneva);
    assert.equal(geneva.sport, 'tennis');
    assert.equal(geneva.competition, 'ATP_250');
    assert.equal(geneva.display.ptBR.question, 'Geneva Open: Learner Tien x Alexander Bublik');
    assert.deepEqual(geneva.display.ptBR.outcomes, ['Learner Tien', 'Alexander Bublik']);

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
  startTime?: string;
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
    endDate: '2099-06-01T00:00:00.000Z',
    startTime: input.startTime ?? '2099-05-25T00:00:00.000Z',
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
  closed?: boolean;
  acceptingOrders?: boolean;
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
    closed: input.closed ?? false,
    archived: false,
    acceptingOrders: input.acceptingOrders ?? true,
    negRisk: false,
    endDate: '2099-06-01T00:00:00.000Z',
    startDate: '2099-05-25T00:00:00.000Z',
  };
}

function bytes32(seed: string): string {
  return `0x${Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64)}`;
}
