import type { BinaryMarketType, Competition, CompetitionLevel, EventType, Sport } from './types.js';

export const DEFAULT_MIN_BETTING_CLOSE_BUFFER_HOURS = 0;
export const DEFAULT_MIN_BETTING_CLOSE_BUFFER_SECONDS = DEFAULT_MIN_BETTING_CLOSE_BUFFER_HOURS * 60 * 60;
export const DEFAULT_RESOLUTION_WINDOW_SECONDS = 14 * 24 * 60 * 60;
export const DEFAULT_LOSER_FEE_BPS = 250;
export const MIN_LOSER_FEE_BPS = 1;
export const MAX_LOSER_FEE_BPS = 1000;
export const TEMPLATE_VERSION = 1;
export const FEE_POLICY_VERSION = 1;

export const allowedSports = new Set<Sport>(['football', 'tennis', 'ufc', 'f1']);

export const allowedFootballCompetitions = new Set<Competition>([
  'FIFA_WORLD_CUP',
  'FIFA_CLUB_WORLD_CUP',
  'BRASILEIRAO',
  'COPA_LIBERTADORES',
]);

export const allowedTennisLevels = new Set<CompetitionLevel>([
  'ATP_250',
  'ATP_500',
  'ATP_MASTERS_1000',
  'ATP_FINALS',
  'GRAND_SLAM',
]);

export const allowedFootballMarketTypes = new Set<BinaryMarketType>([
  'FOOTBALL_TOURNAMENT_WINNER_YES_NO',
  'FOOTBALL_MATCH_TEAM_WIN_YES_NO',
  'FOOTBALL_MATCH_DRAW_YES_NO',
]);

export const allowedTennisMarketTypes = new Set<BinaryMarketType>([
  'TENNIS_MATCH_WINNER',
  'TENNIS_TOURNAMENT_WINNER_YES_NO',
]);

export const allowedUfcMarketTypes = new Set<BinaryMarketType>([
  'UFC_MAIN_EVENT_FIGHT_WINNER',
]);

export const allowedF1MarketTypes = new Set<BinaryMarketType>([
  'F1_RACE_WINNER_YES_NO',
  'F1_SPRINT_WINNER_YES_NO',
  'F1_RACE_OR_SPRINT_HEAD_TO_HEAD',
]);

export const allowedEventTypesBySport: Record<Sport, Set<EventType>> = {
  football: new Set(['TOURNAMENT', 'MATCH']),
  tennis: new Set(['TOURNAMENT', 'MATCH']),
  ufc: new Set(['MAIN_EVENT']),
  f1: new Set(['RACE', 'SPRINT']),
};
