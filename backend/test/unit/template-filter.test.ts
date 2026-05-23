import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectionReasonCodes } from '../../src/modules/templates/domain/rejection-reasons.js';
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');

test('fixture filter accepts only approved M1 sports templates', async () => {
  const candidates = await loadFixtureCandidates();
  const result = new TemplateFilterService().filter(candidates, { now: fixtureNow });

  assert.equal(result.accepted.length, 9);
  assert.deepEqual(new Set(result.accepted.map((template) => template.sport)), new Set(['football', 'tennis', 'ufc', 'f1']));
  assert.equal(result.accepted.every((template) => template.templateHash.startsWith('0x')), true);
});

test('fixture rejection matrix covers every required M1 reason code', async () => {
  const candidates = await loadFixtureCandidates();
  const result = new TemplateFilterService().filter(candidates, {
    now: fixtureNow,
    minBettingCloseBufferSeconds: 2 * 60 * 60,
  });
  const covered = new Set(result.rejected.flatMap((item) => item.reasons));

  for (const reason of rejectionReasonCodes.filter((item) => item !== 'CONDITION_RESOLVED')) {
    assert.equal(covered.has(reason), true, `${reason} should be covered by fixtures`);
  }
});

test('negative-risk markets remain rejected unless staging explicitly opts in', async () => {
  const candidates = await loadFixtureCandidates();
  const accepted = new TemplateFilterService().filter(candidates, { now: fixtureNow }).accepted[0];
  const candidate = {
    id: 'live-negative-risk-world-cup',
    provider: accepted.provider,
    providerMarketId: accepted.providerMarketId,
    slug: accepted.display.slug,
    question: accepted.display.question,
    conditionId: accepted.conditionId,
    questionId: accepted.questionId,
    outcomes: [accepted.outcomeA, accepted.outcomeB],
    active: true,
    closed: false,
    archived: false,
    acceptingOrders: true,
    negRisk: true,
    endDate: new Date((accepted.bettingCloseAt + 30 * 24 * 60 * 60) * 1000).toISOString(),
    eventStartAt: new Date(accepted.eventStartAt * 1000).toISOString(),
    rulesText: 'Official result decides this market.',
    sport: accepted.sport,
    competition: accepted.competition,
    competitionLevel: accepted.competitionLevelCode === 0 ? undefined : 'GRAND_SLAM' as const,
    eventType: accepted.eventType,
    binaryMarketType: accepted.binaryMarketType,
    participants: [],
    resultSource: 'official_result' as const,
    rawProviderPayloadHash: accepted.display.rawProviderPayloadHash,
  };
  const filter = new TemplateFilterService();

  assert.equal(filter.rejectionReasons(candidate, { now: fixtureNow }).includes('NEGATIVE_RISK_UNSUPPORTED'), true);
  assert.equal(filter.rejectionReasons(candidate, { now: fixtureNow, allowNegativeRisk: true }).includes('NEGATIVE_RISK_UNSUPPORTED'), false);
});

test('near-expiry rejection uses configurable close buffer and allows zero', async () => {
  const candidates = await loadFixtureCandidates();
  const accepted = new TemplateFilterService().filter(candidates, { now: fixtureNow }).accepted[0];
  const candidate = {
    id: 'live-near-resolution-world-cup',
    provider: accepted.provider,
    providerMarketId: accepted.providerMarketId,
    slug: accepted.display.slug,
    question: accepted.display.question,
    conditionId: accepted.conditionId,
    questionId: accepted.questionId,
    outcomes: [accepted.outcomeA, accepted.outcomeB],
    active: true,
    closed: false,
    archived: false,
    acceptingOrders: true,
    negRisk: false,
    endDate: new Date(fixtureNow.getTime() + 60 * 60 * 1000).toISOString(),
    eventStartAt: new Date(accepted.eventStartAt * 1000).toISOString(),
    rulesText: 'Official result decides this market.',
    sport: accepted.sport,
    competition: accepted.competition,
    competitionLevel: accepted.competitionLevelCode === 0 ? undefined : 'GRAND_SLAM' as const,
    eventType: accepted.eventType,
    binaryMarketType: accepted.binaryMarketType,
    participants: [],
    resultSource: 'official_result' as const,
    rawProviderPayloadHash: accepted.display.rawProviderPayloadHash,
  };
  const filter = new TemplateFilterService();

  assert.equal(
    filter.rejectionReasons(candidate, { now: fixtureNow, minBettingCloseBufferSeconds: 2 * 60 * 60 }).includes('NEAR_EXPIRY'),
    true,
  );
  assert.equal(
    filter.rejectionReasons(candidate, { now: fixtureNow, minBettingCloseBufferSeconds: 0 }).includes('NEAR_EXPIRY'),
    false,
  );
});

test('tennis match filtering ignores event start age and Polymarket orderability', async () => {
  const candidates = await loadFixtureCandidates();
  const accepted = new TemplateFilterService()
    .filter(candidates, { now: fixtureNow })
    .accepted
    .find((template) => template.sport === 'tennis' && template.binaryMarketType === 'TENNIS_MATCH_WINNER');
  assert.ok(accepted);

  const currentButClosed = {
    id: 'live-tennis-current-closed',
    provider: accepted.provider,
    providerMarketId: accepted.providerMarketId,
    slug: accepted.display.slug,
    question: accepted.display.question,
    conditionId: accepted.conditionId,
    questionId: accepted.questionId,
    outcomes: [accepted.outcomeA, accepted.outcomeB],
    active: true,
    closed: true,
    archived: false,
    acceptingOrders: false,
    negRisk: false,
    endDate: new Date(accepted.bettingCloseAt * 1000).toISOString(),
    eventStartAt: '2026-05-18T21:00:00.000Z',
    rulesText: 'Official result decides this market.',
    sport: accepted.sport,
    competition: accepted.competition,
    competitionLevel: 'ATP_250' as const,
    eventType: accepted.eventType,
    binaryMarketType: accepted.binaryMarketType,
    participants: [accepted.outcomeA.label, accepted.outcomeB.label],
    resultSource: 'official_result' as const,
    rawProviderPayloadHash: accepted.display.rawProviderPayloadHash,
  };
  const startedButUnresolved = {
    ...currentButClosed,
    id: 'live-tennis-started-unresolved',
    providerMarketId: 'live-tennis-started-unresolved',
    eventStartAt: '2026-05-18T00:00:00.000Z',
    closed: false,
    acceptingOrders: true,
  };
  const filter = new TemplateFilterService();

  assert.deepEqual(filter.rejectionReasons(currentButClosed, { now: fixtureNow }), []);
  assert.deepEqual(filter.rejectionReasons(startedButUnresolved, { now: fixtureNow }), []);
});
