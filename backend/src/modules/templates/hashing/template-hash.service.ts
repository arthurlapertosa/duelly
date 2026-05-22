import { encodeAbiParameters, keccak256, toBytes, type Hex } from 'viem';
import {
  DEFAULT_LOSER_FEE_BPS,
  FEE_POLICY_VERSION,
  TEMPLATE_VERSION,
} from '../domain/sports-policy.js';
import { buildPtBRTemplateDisplay } from '../display/template-display-localizer.js';
import type {
  CanonicalSportsTemplate,
  Competition,
  EventType,
  NormalizedMarketCandidate,
  Outcome,
  Sport,
  BinaryMarketType,
} from '../domain/types.js';

const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

export const SPORTS_TEMPLATE_V1_TYPEHASH = hashExactString(
  'SportsTemplateV1(uint16 templateVersion,uint8 providerCode,bytes32 providerMarketIdHash,bytes32 conditionId,bytes32 questionIdHash,uint16 sportCode,uint16 competitionCode,uint16 competitionLevelCode,bytes32 competitionDetailHash,uint16 eventTypeCode,uint16 binaryMarketTypeCode,bytes32 outcomeALabelHash,uint8 outcomeAProviderIndex,bytes32 outcomeBLabelHash,uint8 outcomeBProviderIndex,bytes32 rulesHash,bytes32 rulesSourceHash,uint64 eventStartAt,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,uint16 feePolicyVersion)',
);

const sportCodes: Record<Sport, number> = {
  football: 1,
  tennis: 2,
  ufc: 3,
  f1: 4,
};

const competitionCodes: Record<Competition, number> = {
  FIFA_WORLD_CUP: 101,
  FIFA_CLUB_WORLD_CUP: 102,
  BRASILEIRAO: 103,
  COPA_LIBERTADORES: 104,
  ATP_250: 201,
  ATP_500: 202,
  ATP_MASTERS_1000: 203,
  ATP_FINALS: 204,
  GRAND_SLAM: 205,
  UFC: 301,
  FORMULA_1: 401,
  UNSUPPORTED: 0,
};

const eventTypeCodes: Record<EventType, number> = {
  TOURNAMENT: 1,
  MATCH: 2,
  MAIN_EVENT: 3,
  UNDERCARD: 4,
  RACE: 5,
  SPRINT: 6,
  QUALIFYING: 7,
  PROP: 8,
  SEASON: 9,
  UNSUPPORTED: 0,
};

const binaryMarketTypeCodes: Record<BinaryMarketType, number> = {
  FOOTBALL_TOURNAMENT_WINNER_YES_NO: 101,
  FOOTBALL_BINARY_MATCH_CONDITION: 102,
  TENNIS_MATCH_WINNER: 201,
  TENNIS_TOURNAMENT_WINNER_YES_NO: 202,
  UFC_MAIN_EVENT_FIGHT_WINNER: 301,
  F1_RACE_WINNER_YES_NO: 401,
  F1_SPRINT_WINNER_YES_NO: 402,
  F1_RACE_OR_SPRINT_HEAD_TO_HEAD: 403,
  DISALLOWED_SPREAD: 900,
  DISALLOWED_TOTAL: 901,
  DISALLOWED_PROP: 902,
  DISALLOWED_METHOD: 903,
  DISALLOWED_FASTEST_LAP: 904,
  DISALLOWED_PODIUM: 905,
  DISALLOWED_QUALIFYING: 906,
  DISALLOWED_SEASON: 907,
  UNKNOWN: 0,
};

export function normalizeHashText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function hashString(value: string): Hex {
  return keccak256(toBytes(normalizeHashText(value)));
}

export function hashExactString(value: string): Hex {
  return keccak256(toBytes(value));
}

export function hashJson(value: unknown): Hex {
  return hashString(JSON.stringify(sortJson(value)));
}

export function toUnixSeconds(value?: string): number {
  if (!value) return 0;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`Invalid timestamp: ${value}`);
  return Math.floor(millis / 1000);
}

export function assertBytes32(value: string, field: string): Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${field} must be a 0x-prefixed bytes32 value`);
  }
  return value.toLowerCase() as Hex;
}

export function buildCanonicalTemplate(candidate: NormalizedMarketCandidate): CanonicalSportsTemplate {
  if (!candidate.conditionId) throw new Error('Cannot build template without conditionId');
  if (!candidate.questionId) throw new Error('Cannot build template without questionId');
  if (!candidate.sport || candidate.sport === 'unsupported') throw new Error('Cannot build template without supported sport');
  if (!candidate.competition) throw new Error('Cannot build template without competition');
  if (!candidate.eventType) throw new Error('Cannot build template without event type');
  if (!candidate.binaryMarketType) throw new Error('Cannot build template without binary market type');
  if (!candidate.rulesText) throw new Error('Cannot build template without rules');
  if (!candidate.endDate) throw new Error('Cannot build template without betting close time');
  if (candidate.outcomes.length !== 2) throw new Error('Cannot build template without exactly two outcomes');

  const eventStartAt = toUnixSeconds(candidate.eventStartAt);
  const bettingCloseAt = toUnixSeconds(candidate.endDate);
  const resolutionDeadline = bettingCloseAt + (14 * 24 * 60 * 60);
  const loserFeeBps = candidate.loserFeeBps ?? DEFAULT_LOSER_FEE_BPS;
  const providerMarketIdHash = hashString(candidate.providerMarketId);
  const questionIdHash = hashString(candidate.questionId);
  const rulesHash = hashString(candidate.rulesText);
  const rulesSourceHash = candidate.rulesSourceUrl ? hashString(candidate.rulesSourceUrl) : ZERO_BYTES32;
  const competitionDetailHash = candidate.grandSlamName ? hashString(candidate.grandSlamName) : ZERO_BYTES32;
  const outcomeA = normalizedOutcome(candidate.outcomes[0]);
  const outcomeB = normalizedOutcome(candidate.outcomes[1]);
  const outcomeALabelHash = hashString(outcomeA.label);
  const outcomeBLabelHash = hashString(outcomeB.label);

  const withoutHash = {
    templateId: candidate.id,
    templateVersion: TEMPLATE_VERSION,
    feePolicyVersion: FEE_POLICY_VERSION,
    provider: 'polymarket' as const,
    providerCode: 1,
    providerMarketId: candidate.providerMarketId,
    providerMarketIdHash,
    conditionId: assertBytes32(candidate.conditionId, 'conditionId'),
    questionId: candidate.questionId,
    questionIdHash,
    sport: candidate.sport,
    sportCode: sportCodes[candidate.sport],
    competition: candidate.competition,
    competitionCode: competitionCodes[candidate.competition],
    competitionLevelCode: candidate.competitionLevel ? competitionCodes[candidate.competitionLevel] : 0,
    competitionDetailHash,
    eventType: candidate.eventType,
    eventTypeCode: eventTypeCodes[candidate.eventType],
    binaryMarketType: candidate.binaryMarketType,
    binaryMarketTypeCode: binaryMarketTypeCodes[candidate.binaryMarketType],
    outcomeA,
    outcomeALabelHash,
    outcomeB,
    outcomeBLabelHash,
    rulesHash,
    rulesSourceHash,
    eventStartAt,
    bettingCloseAt,
    resolutionDeadline,
    loserFeeBps,
    active: true,
    display: {
      providerEventId: candidate.providerEventId,
      slug: candidate.slug,
      question: candidate.question,
      ptBR: buildPtBRTemplateDisplay({
        question: candidate.question,
        sport: candidate.sport,
        competition: candidate.competition,
        eventType: candidate.eventType,
        binaryMarketType: candidate.binaryMarketType,
        outcomeA,
        outcomeB,
        participants: candidate.participants,
      }),
      sourceUrl: candidate.sourceUrl,
      rawProviderPayloadHash: candidate.rawProviderPayloadHash,
    },
  };

  const templateHash = hashCanonicalInputs(withoutHash);
  return { ...withoutHash, templateHash };
}

export function hashCanonicalInputs(template: Omit<CanonicalSportsTemplate, 'templateHash'>): Hex {
  return keccak256(encodeAbiParameters([
    { type: 'bytes32' },
    { type: 'uint16' },
    { type: 'uint8' },
    { type: 'bytes32' },
    { type: 'bytes32' },
    { type: 'bytes32' },
    { type: 'uint16' },
    { type: 'uint16' },
    { type: 'uint16' },
    { type: 'bytes32' },
    { type: 'uint16' },
    { type: 'uint16' },
    { type: 'bytes32' },
    { type: 'uint8' },
    { type: 'bytes32' },
    { type: 'uint8' },
    { type: 'bytes32' },
    { type: 'bytes32' },
    { type: 'uint64' },
    { type: 'uint64' },
    { type: 'uint64' },
    { type: 'uint16' },
    { type: 'uint16' },
  ], [
    SPORTS_TEMPLATE_V1_TYPEHASH,
    template.templateVersion,
    template.providerCode,
    template.providerMarketIdHash as Hex,
    template.conditionId as Hex,
    template.questionIdHash as Hex,
    template.sportCode,
    template.competitionCode,
    template.competitionLevelCode,
    template.competitionDetailHash as Hex,
    template.eventTypeCode,
    template.binaryMarketTypeCode,
    template.outcomeALabelHash as Hex,
    template.outcomeA.providerOutcomeIndex,
    template.outcomeBLabelHash as Hex,
    template.outcomeB.providerOutcomeIndex,
    template.rulesHash as Hex,
    template.rulesSourceHash as Hex,
    BigInt(template.eventStartAt),
    BigInt(template.bettingCloseAt),
    BigInt(template.resolutionDeadline),
    template.loserFeeBps,
    template.feePolicyVersion,
  ]));
}

function normalizedOutcome(outcome: Outcome): Outcome {
  return {
    ...outcome,
    label: outcome.label.trim(),
  };
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, sortJson(item)]),
  );
}
