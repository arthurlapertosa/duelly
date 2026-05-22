import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPtBRTemplateDisplay } from '../../src/modules/templates/display/template-display-localizer.js';

test('PT display localizes live tennis match titles structurally', () => {
  const display = buildPtBRTemplateDisplay({
    question: 'Roland Garros, Qualification ATP: August Holmgren vs Daniel Jade',
    sport: 'tennis',
    competition: 'GRAND_SLAM',
    eventType: 'MATCH',
    binaryMarketType: 'TENNIS_MATCH_WINNER',
    outcomeA: { label: 'August Holmgren', providerOutcomeIndex: 0 },
    outcomeB: { label: 'Daniel Jade', providerOutcomeIndex: 1 },
    participants: ['August Holmgren', 'Daniel Jade'],
  });

  assert.equal(display.question, 'Roland Garros, Qualificação ATP: August Holmgren x Daniel Jade');
  assert.deepEqual(display.outcomes, ['August Holmgren', 'Daniel Jade']);
  assert.match(display.rulesSummary, /vencedor oficial da partida/);
});

test('PT display generates deterministic yes/no winner titles and outcomes', () => {
  const football = buildPtBRTemplateDisplay({
    question: 'Will Brazil win the 2026 FIFA World Cup?',
    sport: 'football',
    competition: 'FIFA_WORLD_CUP',
    eventType: 'TOURNAMENT',
    binaryMarketType: 'FOOTBALL_TOURNAMENT_WINNER_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
    participants: ['Brazil'],
  });
  const f1 = buildPtBRTemplateDisplay({
    question: 'Will Driver B win the 2026 Austria sprint race?',
    sport: 'f1',
    competition: 'FORMULA_1',
    eventType: 'SPRINT',
    binaryMarketType: 'F1_SPRINT_WINNER_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
    participants: ['Driver B'],
  });

  assert.equal(football.question, 'Brazil vence a Copa do Mundo FIFA de 2026?');
  assert.deepEqual(football.outcomes, ['Sim', 'Não']);
  assert.match(football.rulesSummary, /campeão oficial da competição/);
  assert.equal(f1.question, 'Driver B vence a sprint da Áustria de 2026?');
  assert.match(f1.rulesSummary, /classificação oficial da sprint/);
});

test('PT display localizes UFC fight titles and falls back safely for unknown patterns', () => {
  const ufc = buildPtBRTemplateDisplay({
    question: 'UFC Fight Night: Song Yadong vs. Deiveson Figueiredo',
    sport: 'ufc',
    competition: 'UFC',
    eventType: 'MAIN_EVENT',
    binaryMarketType: 'UFC_MAIN_EVENT_FIGHT_WINNER',
    outcomeA: { label: 'Song Yadong', providerOutcomeIndex: 0 },
    outcomeB: { label: 'Deiveson Figueiredo', providerOutcomeIndex: 1 },
    participants: ['Song Yadong', 'Deiveson Figueiredo'],
  });
  const unknown = buildPtBRTemplateDisplay({
    question: 'Unexpected market wording',
    sport: 'tennis',
    competition: 'GRAND_SLAM',
    eventType: 'TOURNAMENT',
    binaryMarketType: 'TENNIS_TOURNAMENT_WINNER_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
    participants: ['Player A'],
  });

  assert.equal(ufc.question, 'UFC Fight Night: Song Yadong x Deiveson Figueiredo');
  assert.match(ufc.rulesSummary, /luta principal/);
  assert.equal(unknown.question, 'Unexpected market wording');
  assert.deepEqual(unknown.outcomes, ['Sim', 'Não']);
});
