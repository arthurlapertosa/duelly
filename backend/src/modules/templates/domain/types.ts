export const sports = ['football', 'tennis', 'ufc', 'f1'] as const;
export type Sport = typeof sports[number];

export type Provider = 'polymarket';
export type DiscoveryMode = 'fixture' | 'live';
export type ResultSource = 'official_result' | 'odds_or_probability' | 'ambiguous' | 'unknown';
export type CtfOracleSource =
  | 'gamma-resolved-by'
  | 'configured-default'
  | 'configured-neg-risk'
  | 'configured-allowlist';
export type CtfOracleValidationStatus = 'validated' | 'unvalidated' | 'missing-input';

export type Competition =
  | 'FIFA_WORLD_CUP'
  | 'FIFA_CLUB_WORLD_CUP'
  | 'BRASILEIRAO'
  | 'COPA_LIBERTADORES'
  | 'ATP_250'
  | 'ATP_500'
  | 'ATP_MASTERS_1000'
  | 'ATP_FINALS'
  | 'GRAND_SLAM'
  | 'UFC'
  | 'FORMULA_1'
  | 'UNSUPPORTED';

export type CompetitionLevel = 'ATP_250' | 'ATP_500' | 'ATP_MASTERS_1000' | 'ATP_FINALS' | 'GRAND_SLAM';

export type EventType =
  | 'TOURNAMENT'
  | 'MATCH'
  | 'MAIN_EVENT'
  | 'UNDERCARD'
  | 'RACE'
  | 'SPRINT'
  | 'QUALIFYING'
  | 'PROP'
  | 'SEASON'
  | 'UNSUPPORTED';

export type BinaryMarketType =
  | 'FOOTBALL_TOURNAMENT_WINNER_YES_NO'
  | 'FOOTBALL_MATCH_TEAM_WIN_YES_NO'
  | 'FOOTBALL_MATCH_DRAW_YES_NO'
  | 'FOOTBALL_BINARY_MATCH_CONDITION'
  | 'TENNIS_MATCH_WINNER'
  | 'TENNIS_TOURNAMENT_WINNER_YES_NO'
  | 'UFC_MAIN_EVENT_FIGHT_WINNER'
  | 'F1_RACE_WINNER_YES_NO'
  | 'F1_SPRINT_WINNER_YES_NO'
  | 'F1_RACE_OR_SPRINT_HEAD_TO_HEAD'
  | 'DISALLOWED_SPREAD'
  | 'DISALLOWED_TOTAL'
  | 'DISALLOWED_PROP'
  | 'DISALLOWED_METHOD'
  | 'DISALLOWED_FASTEST_LAP'
  | 'DISALLOWED_PODIUM'
  | 'DISALLOWED_QUALIFYING'
  | 'DISALLOWED_SEASON'
  | 'UNKNOWN';

export interface Outcome {
  label: string;
  providerOutcomeIndex: number;
  tokenId?: string;
}

export interface LocalizedTemplateDisplay {
  question: string;
  rulesSummary: string;
  outcomes: [string, string];
}

export interface NormalizedMarketCandidate {
  id: string;
  provider: Provider;
  providerEventId?: string;
  providerMarketId: string;
  slug: string;
  question: string;
  conditionId?: string;
  questionId?: string;
  resolvedBy?: string;
  ctfOracleAddress?: string;
  ctfOracleSource?: CtfOracleSource;
  ctfOracleValidationStatus?: CtfOracleValidationStatus;
  outcomes: Outcome[];
  outcomeTokenIds?: string[];
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders?: boolean;
  negRisk: boolean;
  endDate?: string;
  eventStartAt?: string;
  rulesText?: string;
  rulesSourceUrl?: string;
  sourceUrl?: string;
  sport?: Sport | 'unsupported';
  competition?: Competition;
  competitionLevel?: CompetitionLevel;
  grandSlamName?: string;
  eventType?: EventType;
  binaryMarketType?: BinaryMarketType;
  participants: string[];
  resultSource: ResultSource;
  loserFeeBps?: number;
  rawProviderPayloadHash: string;
  rawProviderPayload?: unknown;
}

export interface CanonicalSportsTemplate {
  templateId: string;
  templateVersion: number;
  feePolicyVersion: number;
  provider: Provider;
  providerCode: number;
  providerMarketId: string;
  providerMarketIdHash: string;
  conditionId: string;
  questionId: string;
  resolvedBy?: string;
  ctfOracleAddress?: string;
  ctfOracleSource?: CtfOracleSource;
  ctfOracleValidationStatus: CtfOracleValidationStatus;
  questionIdHash: string;
  sport: Sport;
  sportCode: number;
  competition: Competition;
  competitionCode: number;
  competitionLevelCode: number;
  competitionDetailHash: string;
  eventType: EventType;
  eventTypeCode: number;
  binaryMarketType: BinaryMarketType;
  binaryMarketTypeCode: number;
  outcomeA: Outcome;
  outcomeALabelHash: string;
  outcomeB: Outcome;
  outcomeBLabelHash: string;
  rulesHash: string;
  rulesSourceHash: string;
  eventStartAt: number;
  bettingCloseAt: number;
  resolutionDeadline: number;
  loserFeeBps: number;
  active: boolean;
  templateHash: string;
  display: {
    providerEventId?: string;
    slug: string;
    question: string;
    ptBR: LocalizedTemplateDisplay;
    sourceUrl?: string;
    rawProviderPayloadHash: string;
  };
}

export interface RejectedCandidate {
  candidate: NormalizedMarketCandidate;
  reasons: string[];
}

export interface TemplateFilterResult {
  accepted: CanonicalSportsTemplate[];
  rejected: RejectedCandidate[];
}

export interface PublishableTemplatePayload {
  templateHash: string;
  status: 'publishable';
  onChain: {
    function: 'registerTemplate';
    args: {
      templateHash: string;
      conditionId: string;
      marketIdHash: string;
      questionId: string;
      questionIdHash: string;
      sport: Sport;
      competition: Competition;
      eventType: EventType;
      binaryMarketType: BinaryMarketType;
      sportCode: number;
      competitionCode: number;
      eventTypeCode: number;
      binaryMarketTypeCode: number;
      outcomeAProviderIndex: number;
      outcomeBProviderIndex: number;
      templateVersion: number;
      feePolicyVersion: number;
      providerCode: number;
      competitionLevelCode: number;
      competitionDetailHash: string;
      outcomeALabelHash: string;
      outcomeBLabelHash: string;
      rulesSourceHash: string;
      eventStartAt: number;
      rulesHash: string;
      bettingCloseAt: number;
      resolutionDeadline: number;
      loserFeeBps: number;
      active: boolean;
    };
    calldata: null;
  };
  audit: {
    provider: Provider;
    providerMarketId: string;
    providerEventId?: string;
    slug: string;
    question: string;
    sourceUrl?: string;
    rawProviderPayloadHash: string;
    acceptedAt: string;
    publishedBy: string;
  };
}
