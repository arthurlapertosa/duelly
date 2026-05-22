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
