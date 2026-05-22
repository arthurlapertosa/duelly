import {
  DEFAULT_MIN_BETTING_CLOSE_BUFFER_SECONDS,
  DEFAULT_LOSER_FEE_BPS,
  MAX_LOSER_FEE_BPS,
  MIN_LOSER_FEE_BPS,
  allowedEventTypesBySport,
  allowedF1MarketTypes,
  allowedFootballCompetitions,
  allowedFootballMarketTypes,
  allowedSports,
  allowedTennisLevels,
  allowedTennisMarketTypes,
  allowedUfcMarketTypes,
} from '../domain/sports-policy.js';
import type { RejectionReasonCode } from '../domain/rejection-reasons.js';
import type {
  CanonicalSportsTemplate,
  NormalizedMarketCandidate,
  Sport,
  TemplateFilterResult,
} from '../domain/types.js';
import { buildCanonicalTemplate, toUnixSeconds } from '../hashing/template-hash.service.js';

export interface FilterOptions {
  now?: Date;
  allowNegativeRisk?: boolean;
  minBettingCloseBufferSeconds?: number;
}

export class TemplateFilterService {
  filter(candidates: NormalizedMarketCandidate[], options: FilterOptions = {}): TemplateFilterResult {
    const accepted: CanonicalSportsTemplate[] = [];
    const rejected: TemplateFilterResult['rejected'] = [];

    for (const candidate of candidates) {
      const reasons = this.rejectionReasons(candidate, options);
      if (reasons.length > 0) {
        rejected.push({ candidate, reasons });
        continue;
      }
      accepted.push(buildCanonicalTemplate(candidate));
    }

    return { accepted, rejected };
  }

  rejectionReasons(candidate: NormalizedMarketCandidate, options: FilterOptions = {}): RejectionReasonCode[] {
    const reasons = new Set<RejectionReasonCode>();
    const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
    const minBettingCloseBufferSeconds = resolveMinBettingCloseBufferSeconds(options);

    if (candidate.provider !== 'polymarket') reasons.add('UNSUPPORTED_SPORT');
    if (!candidate.sport || candidate.sport === 'unsupported' || !allowedSports.has(candidate.sport)) {
      reasons.add('UNSUPPORTED_SPORT');
    }

    if (!candidate.conditionId) reasons.add('MISSING_CONDITION_ID');
    if (!candidate.questionId) reasons.add('MISSING_QUESTION_ID');
    if (!candidate.rulesText?.trim()) reasons.add('MISSING_RULES');
    if (candidate.negRisk && !options.allowNegativeRisk) reasons.add('NEGATIVE_RISK_UNSUPPORTED');
    if (!candidate.active) reasons.add('MARKET_INACTIVE');
    if (candidate.closed) reasons.add('MARKET_CLOSED');
    if (candidate.archived) reasons.add('MARKET_ARCHIVED');
    if (candidate.acceptingOrders === false) reasons.add('NOT_ACCEPTING_ORDERS');
    if (candidate.outcomes.length !== 2) reasons.add('NON_BINARY_MARKET');
    if (candidate.resultSource === 'ambiguous' || candidate.resultSource === 'unknown') reasons.add('AMBIGUOUS_RESOLUTION');
    if (candidate.resultSource === 'odds_or_probability') reasons.add('ODDS_OR_PROBABILITY_RESULT');
    if (usesOddsOrProbabilityResult(candidate)) reasons.add('ODDS_OR_PROBABILITY_RESULT');

    if (!candidate.endDate) {
      reasons.add('NEAR_EXPIRY');
    } else {
      const closeAt = toUnixSeconds(candidate.endDate);
      if (closeAt - nowSeconds < minBettingCloseBufferSeconds) reasons.add('NEAR_EXPIRY');
    }

    const loserFeeBps = candidate.loserFeeBps ?? DEFAULT_LOSER_FEE_BPS;
    if (!Number.isInteger(loserFeeBps) || loserFeeBps < MIN_LOSER_FEE_BPS || loserFeeBps > MAX_LOSER_FEE_BPS) {
      reasons.add('INVALID_LOSER_FEE_BPS');
    }

    if (candidate.sport && candidate.sport !== 'unsupported') {
      this.addSportReasons(candidate as NormalizedMarketCandidate & { sport: Sport }, reasons);
    }

    return [...reasons].sort();
  }

  private addSportReasons(
    candidate: NormalizedMarketCandidate & { sport: Sport },
    reasons: Set<RejectionReasonCode>,
  ): void {
    if (!candidate.eventType || !allowedEventTypesBySport[candidate.sport].has(candidate.eventType)) {
      reasons.add('UNSUPPORTED_EVENT_TYPE');
    }

    if (candidate.sport === 'football') {
      if (!candidate.competition || !allowedFootballCompetitions.has(candidate.competition)) {
        reasons.add('UNSUPPORTED_COMPETITION');
      }
      if (!candidate.binaryMarketType || !allowedFootballMarketTypes.has(candidate.binaryMarketType)) {
        reasons.add('DISALLOWED_FOOTBALL_MARKET_TYPE');
      }
      return;
    }

    if (candidate.sport === 'tennis') {
      if (!candidate.competitionLevel || !allowedTennisLevels.has(candidate.competitionLevel)) {
        reasons.add('ATP_250_PLUS_UNSUPPORTED');
      }
      if (!candidate.binaryMarketType || !allowedTennisMarketTypes.has(candidate.binaryMarketType)) {
        reasons.add('DISALLOWED_TENNIS_MARKET_TYPE');
      }
      return;
    }

    if (candidate.sport === 'ufc') {
      if (candidate.competition !== 'UFC') reasons.add('UNSUPPORTED_COMPETITION');
      if (!candidate.binaryMarketType || !allowedUfcMarketTypes.has(candidate.binaryMarketType)) {
        reasons.add('DISALLOWED_UFC_MARKET_TYPE');
      }
      return;
    }

    if (candidate.sport === 'f1') {
      if (candidate.competition !== 'FORMULA_1') reasons.add('UNSUPPORTED_COMPETITION');
      if (!candidate.binaryMarketType || !allowedF1MarketTypes.has(candidate.binaryMarketType)) {
        reasons.add('DISALLOWED_F1_MARKET_TYPE');
      }
    }
  }
}

function resolveMinBettingCloseBufferSeconds(options: FilterOptions): number {
  const value = options.minBettingCloseBufferSeconds ?? DEFAULT_MIN_BETTING_CLOSE_BUFFER_SECONDS;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('minBettingCloseBufferSeconds must be a non-negative integer');
  }
  return value;
}

function usesOddsOrProbabilityResult(candidate: NormalizedMarketCandidate): boolean {
  const text = [
    candidate.question,
    candidate.rulesText,
    candidate.slug,
  ].filter(Boolean).join(' ').toLowerCase();
  return /\b(odds?|probabilit(?:y|ies)|implied|price|prices|trading|liquidity|volume)\b/.test(text);
}
