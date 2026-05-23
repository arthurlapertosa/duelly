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

test('PT display localizes accepted live F1 and football result titles', () => {
  const f1RedFlag = buildPtBRTemplateDisplay({
    question: 'Will there be a red flag during the 2026 F1 Canadian Grand Prix?',
    sport: 'f1',
    competition: 'FORMULA_1',
    eventType: 'RACE',
    binaryMarketType: 'F1_RACE_WINNER_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
  });
  const f1HeadToHead = buildPtBRTemplateDisplay({
    question: 'Who will finish higher: Colapinto or Gasly?',
    sport: 'f1',
    competition: 'FORMULA_1',
    eventType: 'RACE',
    binaryMarketType: 'F1_RACE_OR_SPRINT_HEAD_TO_HEAD',
    outcomeA: { label: 'Colapinto', providerOutcomeIndex: 0 },
    outcomeB: { label: 'Gasly', providerOutcomeIndex: 1 },
    participants: ['Colapinto', 'Gasly'],
  });
  const footballTeamWin = buildPtBRTemplateDisplay({
    question: 'Will Cruzeiro EC win on 2026-05-24?',
    sport: 'football',
    competition: 'BRASILEIRAO',
    eventType: 'MATCH',
    binaryMarketType: 'FOOTBALL_MATCH_TEAM_WIN_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
  });
  const footballDraw = buildPtBRTemplateDisplay({
    question: 'Will Cruzeiro EC vs. Associação Chapecoense de Futebol end in a draw?',
    sport: 'football',
    competition: 'BRASILEIRAO',
    eventType: 'MATCH',
    binaryMarketType: 'FOOTBALL_MATCH_DRAW_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
  });

  assert.equal(f1RedFlag.question, 'Haverá bandeira vermelha durante o GP do Canadá de 2026?');
  assert.deepEqual(f1RedFlag.outcomes, ['Sim', 'Não']);
  assert.match(f1RedFlag.rulesSummary, /bandeira vermelha/);
  assert.equal(f1HeadToHead.question, 'Quem termina melhor: Colapinto ou Gasly?');
  assert.deepEqual(f1HeadToHead.outcomes, ['Colapinto', 'Gasly']);
  assert.equal(footballTeamWin.question, 'Cruzeiro EC vence em 24/05/2026?');
  assert.deepEqual(footballTeamWin.outcomes, ['Sim', 'Não']);
  assert.match(footballTeamWin.rulesSummary, /resultado oficial da partida/);
  assert.equal(footballDraw.question, 'Cruzeiro EC x Associação Chapecoense de Futebol termina empatado?');
  assert.deepEqual(footballDraw.outcomes, ['Sim', 'Não']);
  assert.match(footballDraw.rulesSummary, /resultado oficial da partida/);
});
