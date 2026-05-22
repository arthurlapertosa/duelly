import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig, type AppConfig } from '../../src/config/env.js';
import { GammaClient } from '../../src/modules/templates/discovery/gamma-client.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';

const filterNow = new Date('2026-05-22T00:00:00.000Z');

test('Gamma live markets infer official result source from resolution text', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname === '/events') {
      return jsonResponse([
        gammaEvent({
          id: 'event-football-1',
          slug: 'brazil-world-cup-winner',
          title: 'Brazil World Cup winner',
          tags: [{ slug: 'football', label: 'Football' }, { slug: 'fifa-world-cup', label: 'FIFA World Cup' }],
          markets: [
            gammaMarket({
              id: 'gamma-1',
              slug: 'brazil-world-cup-winner',
              question: 'Will Brazil win the FIFA World Cup?',
              rules: 'This market resolves Yes if Brazil is officially declared the tournament winner; otherwise it resolves No.',
              conditionSeed: 'football-official-source',
              questionSeed: 'football-official-source-question',
              outcomes: ['Yes', 'No'],
              endDate: '2026-07-20T00:00:00.000Z',
              startDate: '2026-06-11T00:00:00.000Z',
            }),
          ],
        }),
      ]);
    }
    return jsonResponse([]);
  }, async () => {
    const candidates = await new GammaClient(testConfig({ maxResults: 1 })).discoverMarkets('football');
    const result = new TemplateFilterService().filter(candidates, {
      now: filterNow,
      minBettingCloseBufferSeconds: 0,
    });

    assert.equal(candidates[0].resultSource, 'official_result');
    assert.equal(result.accepted.length, 1);
    assert.equal(result.rejected.length, 0);
  });
});

test('Gamma discovery does not starve later sports when max results is small', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname !== '/events') return jsonResponse([]);

    if (url.searchParams.get('series_slug') === 'atp') {
      return jsonResponse([
        tennisEvent({
          id: 'event-tennis-1',
          title: 'Geneva Open: Learner Tien vs Alexander Bublik',
          markets: [
            tennisMarket({
              id: 'tennis-soon',
              question: 'Geneva Open: Learner Tien vs Alexander Bublik',
              conditionSeed: 'tennis-soon',
              questionSeed: 'tennis-soon-question',
              endDate: '2026-05-23T00:00:00.000Z',
            }),
          ],
        }),
      ]);
    }

    if (url.searchParams.get('tag_slug') === 'ufc') {
      return jsonResponse([
        ufcEvent({
          id: 'event-ufc-1',
          title: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo (Bantamweight, Main Card)',
          markets: [
            ufcMarket({
              id: 'ufc-later',
              question: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo',
              conditionSeed: 'ufc-later',
              questionSeed: 'ufc-later-question',
              endDate: '2026-06-01T00:00:00.000Z',
            }),
          ],
        }),
      ]);
    }

    if (url.searchParams.get('tag_id') === '435') {
      return jsonResponse([
        gammaEvent({
          id: 'event-f1-1',
          slug: 'monaco-grand-prix-winner',
          title: 'Monaco Grand Prix winner',
          tags: [{ slug: 'formula-1', label: 'Formula 1' }],
          markets: [
            gammaMarket({
              id: 'f1-later',
              slug: 'monaco-grand-prix-winner',
              question: 'Will Lando Norris win the Monaco Grand Prix?',
              rules: 'This market resolves to the official race winner.',
              conditionSeed: 'f1-later',
              questionSeed: 'f1-later-question',
              outcomes: ['Yes', 'No'],
              endDate: '2026-06-10T00:00:00.000Z',
            }),
          ],
        }),
      ]);
    }

    return jsonResponse([
      gammaEvent({
        id: 'event-football-1',
        slug: 'world-cup-winner',
        title: 'FIFA World Cup winner',
        tags: [{ slug: 'football', label: 'Football' }, { slug: 'fifa-world-cup', label: 'FIFA World Cup' }],
        markets: [
          gammaMarket({
            id: 'football-later',
            slug: 'world-cup-winner',
            question: 'Will Brazil win the FIFA World Cup?',
            rules: 'This market resolves to the official tournament winner.',
            conditionSeed: 'football-later',
            questionSeed: 'football-later-question',
            outcomes: ['Yes', 'No'],
            endDate: '2026-07-20T00:00:00.000Z',
          }),
        ],
      }),
    ]);
  }, async () => {
    const candidates = await new GammaClient(testConfig({ maxResults: 1 })).discoverMarkets();

    assert.equal(candidates.some((candidate) => candidate.sport === 'football'), true);
    assert.equal(candidates.some((candidate) => candidate.sport === 'tennis'), true);
    assert.equal(candidates.some((candidate) => candidate.sport === 'ufc'), true);
    assert.equal(candidates.some((candidate) => candidate.sport === 'f1'), true);
    assert.equal(candidates[0].sport, 'tennis');
  });
});

test('Gamma discovery flattens sports-tagged events into market candidates', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname === '/events') {
      return jsonResponse([
        gammaEvent({
          id: 'event-1',
          slug: 'bra-sao-bot-2026-05-23',
          title: 'São Paulo FC vs. Botafogo FR',
          description: 'Upcoming Brazil Série A game between São Paulo FC and Botafogo FR.',
          tags: [{ slug: 'football', label: 'Football' }, { slug: 'brasileirao', label: 'Brasileirão' }],
          negRisk: true,
          endDate: '2026-05-23T20:00:00.000Z',
          startTime: '2026-05-23T20:00:00.000Z',
          markets: [
            gammaMarket({
              id: 'market-1',
              slug: 'bra-sao-bot-2026-05-23-sao',
              question: 'Will São Paulo FC win on 2026-05-23?',
              rules: 'This market resolves based on the official final match statistics.',
              conditionSeed: 'sao-bot-market',
              questionSeed: 'sao-bot-question',
              outcomes: ['Yes', 'No'],
              negRisk: true,
              endDate: '2026-05-23T20:00:00.000Z',
              startDate: '2026-05-23T20:00:00.000Z',
            }),
          ],
        }),
      ]);
    }
    return jsonResponse([]);
  }, async () => {
    const candidates = await new GammaClient(testConfig({ maxResults: 1 })).discoverMarkets('football');
    const result = new TemplateFilterService().filter(candidates, {
      now: filterNow,
      allowNegativeRisk: true,
      minBettingCloseBufferSeconds: 0,
    });

    assert.equal(candidates[0].providerEventId, 'event-1');
    assert.equal(result.accepted.length, 1);
    assert.equal(result.accepted[0].competition, 'BRASILEIRAO');
    assert.equal(result.accepted[0].eventType, 'MATCH');
  });
});

test('Gamma live tennis and UFC discovery use sport feeds with future end-date filters', async () => {
  const requestedUrls: URL[] = [];

  await withMockedFetch(async (url) => {
    requestedUrls.push(url);
    return jsonResponse([]);
  }, async () => {
    const client = new GammaClient(testConfig({ maxResults: 25 }));
    await client.discoverMarkets('tennis');
    await client.discoverMarkets('ufc');
  });

  const eventUrls = requestedUrls.filter((url) => url.pathname === '/events');
  assert.equal(eventUrls.some((url) => url.searchParams.get('series_slug') === 'atp'), true);
  assert.equal(eventUrls.some((url) => url.searchParams.get('series_slug') === 'wta'), true);
  assert.equal(eventUrls.some((url) => url.searchParams.get('tag_slug') === 'ufc'), true);
  assert.equal(eventUrls.every((url) => url.searchParams.get('active') === 'true'), true);
  assert.equal(eventUrls.every((url) => url.searchParams.get('closed') === 'false'), true);
  assert.equal(eventUrls.every((url) => url.searchParams.has('end_date_min')), true);
  assert.equal(eventUrls.every((url) => url.searchParams.get('order') === 'startTime'), true);
  assert.equal(eventUrls.every((url) => url.searchParams.get('ascending') === 'true'), true);
  assert.equal(eventUrls.every((url) => url.searchParams.get('limit') === '25'), true);
});

test('Gamma search fallback does not force-label unrelated UFC results', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname === '/markets') {
      return jsonResponse([
        gammaMarket({
          id: 'unrelated-market',
          slug: 'nfl-award-market',
          question: 'Will a quarterback win MVP?',
          rules: 'This market resolves to the official award winner.',
          conditionSeed: 'unrelated-market',
          questionSeed: 'unrelated-market-question',
          outcomes: ['Yes', 'No'],
          tags: [{ slug: 'football', label: 'Football' }],
        }),
      ]);
    }
    return jsonResponse([]);
  }, async () => {
    const candidates = await new GammaClient(testConfig()).discoverMarkets('ufc');

    assert.equal(candidates.length, 0);
  });
});

test('Gamma tennis accepts started ATP match winners independent of Polymarket orderability', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname === '/events' && url.searchParams.get('series_slug') === 'atp') {
      return jsonResponse([
        tennisEvent({
          id: 'geneva-open-event',
          title: 'Geneva Open: Learner Tien vs Alexander Bublik',
          startTime: '2026-05-23T14:00:00.000Z',
          markets: [
            tennisMarket({
              id: 'geneva-open-winner',
              question: 'Geneva Open: Learner Tien vs Alexander Bublik',
              conditionSeed: 'geneva-open-winner',
              questionSeed: 'geneva-open-winner-question',
              closed: true,
              acceptingOrders: false,
            }),
          ],
        }),
        tennisEvent({
          id: 'hamburg-open-event',
          title: 'Hamburg European Open: Alex de Minaur vs Tommy Paul',
          startTime: '2026-05-22T15:30:00.000Z',
          markets: [
            tennisMarket({
              id: 'hamburg-open-winner',
              question: 'Hamburg European Open: Alex de Minaur vs Tommy Paul',
              conditionSeed: 'hamburg-open-winner',
              questionSeed: 'hamburg-open-winner-question',
              outcomes: ['Alex de Minaur', 'Tommy Paul'],
            }),
          ],
        }),
        tennisEvent({
          id: 'started-roland-garros-qualification',
          title: 'Roland Garros, Qualification ATP: Thomas Faurel vs Jay Clarke',
          startTime: '2026-05-20T08:00:00.000Z',
          markets: [
            tennisMarket({
              id: 'started-rg-winner',
              question: 'Roland Garros, Qualification ATP: Thomas Faurel vs Jay Clarke',
              conditionSeed: 'started-rg-winner',
              questionSeed: 'started-rg-winner-question',
              outcomes: ['Thomas Faurel', 'Jay Clarke'],
            }),
          ],
        }),
      ]);
    }
    return jsonResponse([]);
  }, async () => {
    const candidates = await new GammaClient(testConfig()).discoverMarkets('tennis');
    const result = new TemplateFilterService().filter(candidates, {
      now: filterNow,
      minBettingCloseBufferSeconds: 0,
    });

    assert.deepEqual(
      result.accepted.map((template) => template.providerMarketId).sort(),
      ['geneva-open-winner', 'hamburg-open-winner', 'started-rg-winner'],
    );
    assert.deepEqual(
      result.accepted.map((template) => template.competition).sort(),
      ['ATP_250', 'ATP_500', 'GRAND_SLAM'],
    );
    assert.equal(candidates.find((candidate) => candidate.providerMarketId === 'geneva-open-winner')?.closed, true);
    assert.equal(candidates.find((candidate) => candidate.providerMarketId === 'geneva-open-winner')?.acceptingOrders, false);
    assert.equal(candidates.every((candidate) => candidate.resultSource === 'official_result'), true);
  });
});

test('Gamma tennis rejects totals, set winners, completed-match props, and unsupported ITF events', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname === '/events' && url.searchParams.get('series_slug') === 'atp') {
      return jsonResponse([
        tennisEvent({
          id: 'tennis-props-event',
          title: 'Geneva Open: Learner Tien vs Alexander Bublik',
          markets: [
            tennisMarket({
              id: 'tennis-total-games',
              question: 'Geneva Open: Learner Tien vs Alexander Bublik Total Games O/U',
              conditionSeed: 'tennis-total-games',
              questionSeed: 'tennis-total-games-question',
            }),
            tennisMarket({
              id: 'tennis-set-winner',
              question: 'Geneva Open: Learner Tien vs Alexander Bublik Set 1 Winner',
              conditionSeed: 'tennis-set-winner',
              questionSeed: 'tennis-set-winner-question',
            }),
            tennisMarket({
              id: 'tennis-completed-match',
              question: 'Will Geneva Open: Learner Tien vs Alexander Bublik be a completed match?',
              conditionSeed: 'tennis-completed-match',
              questionSeed: 'tennis-completed-match-question',
            }),
          ],
        }),
        tennisEvent({
          id: 'tennis-itf-event',
          title: 'ITF Monastir: Player A vs Player B',
          markets: [
            tennisMarket({
              id: 'tennis-itf-match',
              question: 'ITF Monastir: Player A vs Player B',
              conditionSeed: 'tennis-itf-match',
              questionSeed: 'tennis-itf-match-question',
            }),
          ],
        }),
      ]);
    }
    return jsonResponse([]);
  }, async () => {
    const candidates = await new GammaClient(testConfig()).discoverMarkets('tennis');
    const result = new TemplateFilterService().filter(candidates, {
      now: filterNow,
      minBettingCloseBufferSeconds: 0,
    });

    assert.equal(result.accepted.length, 0);
    assert.equal(reasonSet(result, 'tennis-total-games').has('DISALLOWED_TENNIS_MARKET_TYPE'), true);
    assert.equal(reasonSet(result, 'tennis-set-winner').has('DISALLOWED_TENNIS_MARKET_TYPE'), true);
    assert.equal(reasonSet(result, 'tennis-completed-match').has('DISALLOWED_TENNIS_MARKET_TYPE'), true);
    assert.equal(reasonSet(result, 'tennis-itf-match').has('ATP_250_PLUS_UNSUPPORTED'), true);
  });
});

test('Gamma UFC accepts only headline fight winners from live tag events', async () => {
  await withMockedFetch(async (url) => {
    if (url.pathname === '/events' && url.searchParams.get('tag_slug') === 'ufc') {
      return jsonResponse([
        ufcEvent({
          id: 'ufc-song-figueiredo',
          title: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo (Bantamweight, Main Card)',
          markets: [
            ufcMarket({
              id: 'ufc-headline-winner',
              question: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo',
              conditionSeed: 'ufc-headline-winner',
              questionSeed: 'ufc-headline-winner-question',
            }),
            ufcMarket({
              id: 'ufc-non-headline-main-card',
              question: 'UFC Fight Night: Alonzo Menifield vs Zhang Mingyang',
              conditionSeed: 'ufc-non-headline-main-card',
              questionSeed: 'ufc-non-headline-main-card-question',
              outcomes: ['Alonzo Menifield', 'Zhang Mingyang'],
            }),
            ufcMarket({
              id: 'ufc-prelim',
              question: 'UFC Fight Night Prelims: Luana Santos vs Tainara Lisboa',
              conditionSeed: 'ufc-prelim',
              questionSeed: 'ufc-prelim-question',
              outcomes: ['Luana Santos', 'Tainara Lisboa'],
            }),
            ufcMarket({
              id: 'ufc-distance-prop',
              question: 'UFC Fight Night: Song Yadong vs Deiveson Figueiredo to go the distance?',
              conditionSeed: 'ufc-distance-prop',
              questionSeed: 'ufc-distance-prop-question',
              outcomes: ['Yes', 'No'],
            }),
          ],
        }),
        ufcEvent({
          id: 'ufc-self-referential-main-card',
          title: 'UFC 316: Alonzo Menifield vs Zhang Mingyang (Light Heavyweight, Main Card)',
          description: 'This market resolves to the official winner of this fight at UFC 316: Alonzo Menifield vs Zhang Mingyang.',
          markets: [
            ufcMarket({
              id: 'ufc-self-referential-main-card-winner',
              question: 'UFC 316: Alonzo Menifield vs Zhang Mingyang (Light Heavyweight, Main Card)',
              conditionSeed: 'ufc-self-referential-main-card-winner',
              questionSeed: 'ufc-self-referential-main-card-winner-question',
              outcomes: ['Alonzo Menifield', 'Zhang Mingyang'],
            }),
          ],
        }),
      ]);
    }
    return jsonResponse([]);
  }, async () => {
    const candidates = await new GammaClient(testConfig()).discoverMarkets('ufc');
    const result = new TemplateFilterService().filter(candidates, {
      now: filterNow,
      minBettingCloseBufferSeconds: 0,
    });

    assert.equal(result.accepted.length, 1);
    assert.equal(result.accepted[0].providerMarketId, 'ufc-headline-winner');
    assert.equal(result.accepted[0].eventType, 'MAIN_EVENT');
    assert.equal(result.accepted[0].binaryMarketType, 'UFC_MAIN_EVENT_FIGHT_WINNER');
    assert.equal(reasonSet(result, 'ufc-non-headline-main-card').has('UNSUPPORTED_EVENT_TYPE'), true);
    assert.equal(reasonSet(result, 'ufc-self-referential-main-card-winner').has('UNSUPPORTED_EVENT_TYPE'), true);
    assert.equal(reasonSet(result, 'ufc-prelim').has('UNSUPPORTED_EVENT_TYPE'), true);
    assert.equal(reasonSet(result, 'ufc-distance-prop').has('DISALLOWED_UFC_MARKET_TYPE'), true);
  });
});

async function withMockedFetch(
  handler: (url: URL) => Promise<Response> | Response,
  run: () => Promise<void>,
): Promise<void> {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => handler(new URL(String(input)));
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
  }
}

function testConfig(overrides: Partial<AppConfig['polymarket']> = {}): AppConfig {
  const base = loadAppConfig();
  return {
    ...base,
    polymarket: {
      ...base.polymarket,
      gammaBaseUrl: 'https://gamma.example.test',
      maxResults: 20,
      timeoutMs: 1000,
      allowNegativeRisk: false,
      minBettingCloseBufferSeconds: 0,
      ...overrides,
    },
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200 });
}

function gammaEvent(input: {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  tags?: unknown[];
  series?: unknown[];
  negRisk?: boolean;
  endDate?: string;
  startTime?: string;
  markets: unknown[];
}) {
  return {
    id: input.id,
    slug: input.slug ?? input.id,
    title: input.title,
    description: input.description,
    tags: input.tags ?? [],
    series: input.series ?? [],
    active: true,
    closed: false,
    archived: false,
    negRisk: input.negRisk ?? false,
    endDate: input.endDate ?? '2026-06-01T00:00:00.000Z',
    startTime: input.startTime ?? '2026-05-25T00:00:00.000Z',
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
  tags?: unknown[];
  series?: unknown[];
  negRisk?: boolean;
  endDate?: string;
  startDate?: string;
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
    tags: input.tags ?? [],
    series: input.series ?? [],
    active: true,
    closed: input.closed ?? false,
    archived: false,
    acceptingOrders: input.acceptingOrders ?? true,
    negRisk: input.negRisk ?? false,
    endDate: input.endDate ?? '2026-06-01T00:00:00.000Z',
    startDate: input.startDate ?? '2026-05-25T00:00:00.000Z',
  };
}

function tennisEvent(input: {
  id: string;
  title: string;
  startTime?: string;
  markets: unknown[];
}) {
  return gammaEvent({
    id: input.id,
    title: input.title,
    startTime: input.startTime,
    tags: [{ slug: 'tennis', label: 'Tennis' }],
    series: [{ slug: 'atp', ticker: 'ATP', title: 'ATP' }],
    markets: input.markets,
  });
}

function tennisMarket(input: {
  id: string;
  question: string;
  conditionSeed: string;
  questionSeed: string;
  outcomes?: string[];
  endDate?: string;
  closed?: boolean;
  acceptingOrders?: boolean;
}) {
  return gammaMarket({
    id: input.id,
    slug: input.id,
    question: input.question,
    rules: 'This market resolves to the official match winner. If there is a retirement, walkover, cancellation, or no contest, this market resolves 50-50.',
    conditionSeed: input.conditionSeed,
    questionSeed: input.questionSeed,
    outcomes: input.outcomes ?? ['Learner Tien', 'Alexander Bublik'],
    tags: [{ slug: 'tennis', label: 'Tennis' }],
    series: [{ slug: 'atp', ticker: 'ATP', title: 'ATP' }],
    endDate: input.endDate,
    closed: input.closed,
    acceptingOrders: input.acceptingOrders,
  });
}

function ufcEvent(input: {
  id: string;
  title: string;
  description?: string;
  markets: unknown[];
}) {
  return gammaEvent({
    id: input.id,
    title: input.title,
    description: input.description ?? 'This market resolves to the official winner of this fight at UFC Fight Night: Song vs. Figueiredo.',
    tags: [{ slug: 'ufc', label: 'UFC' }],
    markets: input.markets,
  });
}

function ufcMarket(input: {
  id: string;
  question: string;
  conditionSeed: string;
  questionSeed: string;
  outcomes?: string[];
  endDate?: string;
}) {
  return gammaMarket({
    id: input.id,
    slug: input.id,
    question: input.question,
    rules: 'This market resolves to the official fight winner.',
    conditionSeed: input.conditionSeed,
    questionSeed: input.questionSeed,
    outcomes: input.outcomes ?? ['Song Yadong', 'Deiveson Figueiredo'],
    tags: [{ slug: 'ufc', label: 'UFC' }],
    endDate: input.endDate,
  });
}

function reasonSet(
  result: ReturnType<TemplateFilterService['filter']>,
  providerMarketId: string,
): Set<string> {
  const rejection = result.rejected.find((item) => item.candidate.providerMarketId === providerMarketId);
  assert.ok(rejection, `expected rejection for ${providerMarketId}`);
  return new Set(rejection.reasons);
}

function bytes32(seed: string): string {
  return `0x${Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64)}`;
}
