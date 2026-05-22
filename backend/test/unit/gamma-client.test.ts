import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../../src/config/env.js';
import { GammaClient } from '../../src/modules/templates/discovery/gamma-client.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';

test('Gamma live markets infer official result source from resolution text', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{
    id: 'gamma-1',
    slug: 'brazil-world-cup-winner',
    question: 'Will Brazil win the FIFA World Cup?',
    rules: 'This market resolves Yes if Brazil is officially declared the tournament winner; otherwise it resolves No.',
    conditionId: `0x${'11'.repeat(32)}`,
    questionID: `0x${'22'.repeat(32)}`,
    outcomes: ['Yes', 'No'],
    clobTokenIds: ['100', '200'],
    active: true,
    closed: false,
    archived: false,
    acceptingOrders: true,
    negRisk: false,
    endDate: '2026-07-20T00:00:00.000Z',
    startDate: '2026-06-11T00:00:00.000Z',
  }]), { status: 200 });

  try {
    const config = {
      ...loadAppConfig(),
      polymarket: {
        ...loadAppConfig().polymarket,
        gammaBaseUrl: 'https://gamma.example.test',
        maxResults: 1,
      },
    };
    const candidates = await new GammaClient(config).discoverMarkets('football');
    const result = new TemplateFilterService().filter(candidates, { now: new Date('2026-05-22T00:00:00.000Z') });

    assert.equal(candidates[0].resultSource, 'official_result');
    assert.equal(result.accepted.length, 1);
    assert.equal(result.rejected.length, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Gamma discovery does not starve later sports when max results is small', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const term = url.searchParams.get('search') ?? 'unknown';
    return new Response(JSON.stringify([{
      id: `gamma-${term.replaceAll(/\W+/g, '-').toLowerCase()}`,
      slug: `market-${term.replaceAll(/\W+/g, '-').toLowerCase()}`,
      question: term.includes('ATP') ? 'ATP 250 Match: Player A vs Player B' : `${term} winner`,
      rules: 'This market resolves to the official winner.',
      conditionId: `0x${Buffer.from(term).toString('hex').padEnd(64, '0').slice(0, 64)}`,
      questionID: `0x${Buffer.from(`q-${term}`).toString('hex').padEnd(64, '0').slice(0, 64)}`,
      outcomes: ['Yes', 'No'],
      clobTokenIds: ['100', '200'],
      active: true,
      closed: false,
      archived: false,
      acceptingOrders: true,
      negRisk: false,
      endDate: term.includes('ATP') ? '2026-05-23T00:00:00.000Z' : '2026-07-20T00:00:00.000Z',
      startDate: '2026-05-22T00:00:00.000Z',
    }]), { status: 200 });
  };

  try {
    const base = loadAppConfig();
    const config = {
      ...base,
      polymarket: {
        ...base.polymarket,
        gammaBaseUrl: 'https://gamma.example.test',
        maxResults: 1,
      },
    };
    const candidates = await new GammaClient(config).discoverMarkets();

    assert.equal(candidates.some((candidate) => candidate.sport === 'football'), true);
    assert.equal(candidates.some((candidate) => candidate.sport === 'tennis'), true);
    assert.equal(candidates[0].sport, 'tennis');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Gamma discovery flattens sports-tagged events into market candidates', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/events') {
      return new Response(JSON.stringify([{
        id: 'event-1',
        slug: 'bra-sao-bot-2026-05-23',
        title: 'São Paulo FC vs. Botafogo FR',
        description: 'Upcoming Brazil Série A game between São Paulo FC and Botafogo FR.',
        active: true,
        closed: false,
        archived: false,
        negRisk: true,
        endDate: '2026-05-23T20:00:00.000Z',
        startTime: '2026-05-23T20:00:00.000Z',
        markets: [{
          id: 'market-1',
          slug: 'bra-sao-bot-2026-05-23-sao',
          question: 'Will São Paulo FC win on 2026-05-23?',
          description: 'This market resolves based on the official final match statistics.',
          conditionId: `0x${'33'.repeat(32)}`,
          questionID: `0x${'44'.repeat(32)}`,
          outcomes: ['Yes', 'No'],
          clobTokenIds: ['100', '200'],
          active: true,
          closed: false,
          archived: false,
          acceptingOrders: true,
          negRisk: true,
          endDate: '2026-05-23T20:00:00.000Z',
          gameStartTime: '2026-05-23 20:00:00+00',
        }],
      }]), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  };

  try {
    const base = loadAppConfig();
    const config = {
      ...base,
      polymarket: {
        ...base.polymarket,
        gammaBaseUrl: 'https://gamma.example.test',
        maxResults: 1,
      },
    };
    const candidates = await new GammaClient(config).discoverMarkets('football');
    const result = new TemplateFilterService().filter(candidates, {
      now: new Date('2026-05-22T00:00:00.000Z'),
      allowNegativeRisk: true,
      minBettingCloseBufferSeconds: 0,
    });

    assert.equal(candidates[0].providerEventId, 'event-1');
    assert.equal(result.accepted.length, 1);
    assert.equal(result.accepted[0].competition, 'BRASILEIRAO');
    assert.equal(result.accepted[0].eventType, 'MATCH');
  } finally {
    globalThis.fetch = previousFetch;
  }
});
