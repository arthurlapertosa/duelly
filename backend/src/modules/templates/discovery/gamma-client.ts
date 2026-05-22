import type { AppConfig } from '../../../config/env.js';
import type { BinaryMarketType, Competition, CompetitionLevel, EventType, NormalizedMarketCandidate, Outcome, Sport } from '../domain/types.js';
import { hashJson } from '../hashing/template-hash.service.js';

const searchTermsBySport: Record<Sport, string[]> = {
  football: ['FIFA World Cup', 'Brasileirão', 'Copa Libertadores'],
  tennis: ['ATP 250', 'ATP 500', 'ATP Masters 1000', 'ATP Finals', 'Grand Slam', 'Wimbledon'],
  ufc: ['UFC main event', 'UFC'],
  f1: ['Formula 1', 'F1 Grand Prix', 'F1 sprint winner'],
};

type GammaMarket = Record<string, unknown>;

export class GammaClient {
  constructor(private readonly config: AppConfig) {}

  async discoverMarkets(sport?: Sport): Promise<NormalizedMarketCandidate[]> {
    const sports = sport ? [sport] : (Object.keys(searchTermsBySport) as Sport[]);
    const candidates: NormalizedMarketCandidate[] = [];

    for (const sportName of sports) {
      for (const term of searchTermsBySport[sportName]) {
        const markets = await this.search(term);
        candidates.push(...markets.map((market) => this.normalizeMarket(market, sportName)));
      }
    }

    return candidates.slice(0, this.config.polymarket.maxResults);
  }

  private async search(term: string): Promise<GammaMarket[]> {
    const url = new URL('/markets', this.config.polymarket.gammaBaseUrl);
    url.searchParams.set('search', term);
    url.searchParams.set('limit', String(this.config.polymarket.maxResults));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.polymarket.timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Gamma API returned ${response.status}`);
      const json = await response.json() as unknown;
      if (Array.isArray(json)) return json as GammaMarket[];
      if (json && typeof json === 'object' && Array.isArray((json as { markets?: unknown }).markets)) {
        return (json as { markets: GammaMarket[] }).markets;
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeMarket(market: GammaMarket, sport: Sport): NormalizedMarketCandidate {
    const outcomes = parseStringArray(market.outcomes).map<Outcome>((label, index) => ({
      label,
      providerOutcomeIndex: index,
      tokenId: parseStringArray(market.clobTokenIds)[index],
    }));
    const question = stringField(market.question) ?? stringField(market.title) ?? 'Untitled Polymarket market';
    const providerMarketId = String(market.id ?? market.marketId ?? market.slug ?? question);
    const rulesText = stringField(market.rules) ?? stringField(market.description);
    const resolutionSource = stringField(market.resolutionSource);
    const classification = classifyLiveMarket({
      sport,
      text: [question, stringField(market.slug), rulesText, resolutionSource].filter(Boolean).join(' '),
    });

    return {
      id: `live-${providerMarketId}`,
      provider: 'polymarket',
      providerEventId: optionalString(market.eventId),
      providerMarketId,
      slug: stringField(market.slug) ?? providerMarketId,
      question,
      conditionId: optionalString(market.conditionId),
      questionId: optionalString(market.questionID ?? market.questionId),
      outcomes,
      outcomeTokenIds: parseStringArray(market.clobTokenIds),
      active: Boolean(market.active),
      closed: Boolean(market.closed),
      archived: Boolean(market.archived),
      acceptingOrders: market.acceptingOrders === undefined ? undefined : Boolean(market.acceptingOrders),
      negRisk: Boolean(market.negRisk),
      endDate: optionalString(market.endDate ?? market.endDateIso),
      eventStartAt: optionalString(market.startDate ?? market.eventStartTime),
      rulesText,
      rulesSourceUrl: optionalString(market.rulesSourceUrl),
      sourceUrl: market.slug ? `https://polymarket.com/event/${String(market.slug)}` : undefined,
      sport,
      competition: classification.competition,
      competitionLevel: classification.competitionLevel,
      grandSlamName: classification.grandSlamName,
      eventType: classification.eventType,
      binaryMarketType: classification.binaryMarketType,
      participants: [],
      resultSource: inferResultSource([question, rulesText, resolutionSource].filter(Boolean).join(' ')),
      loserFeeBps: undefined,
      rawProviderPayloadHash: hashJson(market),
    };
  }
}

function inferResultSource(text: string): NormalizedMarketCandidate['resultSource'] {
  const normalized = text.toLowerCase();
  if (/\b(odds?|probabilit(?:y|ies)|implied|price|prices|trading|liquidity|volume)\b/.test(normalized)) {
    return 'odds_or_probability';
  }
  if (/\b(50-50|fifty[- ]fifty|split|ambiguous|subjective)\b/.test(normalized)) {
    return 'ambiguous';
  }
  if (/\b(resolve|resolves|resolution|official|winner|defeat|win|wins|otherwise)\b/.test(normalized)) {
    return 'official_result';
  }
  return 'unknown';
}

function classifyLiveMarket(input: { sport: Sport; text: string }): {
  competition: Competition;
  competitionLevel?: CompetitionLevel;
  grandSlamName?: string;
  eventType: EventType;
  binaryMarketType: BinaryMarketType;
} {
  const text = input.text.toLowerCase();

  if (input.sport === 'football') {
    const competition: Competition =
      text.includes('club world cup') ? 'FIFA_CLUB_WORLD_CUP'
        : text.includes('world cup') ? 'FIFA_WORLD_CUP'
          : text.includes('brasileir') || text.includes('brazil serie a') || text.includes('brazilian serie a') ? 'BRASILEIRAO'
            : text.includes('libertadores') ? 'COPA_LIBERTADORES'
              : 'UNSUPPORTED';
    return {
      competition,
      eventType: text.includes('match') || text.includes(' vs ') ? 'MATCH' : 'TOURNAMENT',
      binaryMarketType: isDisallowedPropText(text) ? 'DISALLOWED_PROP' : 'FOOTBALL_TOURNAMENT_WINNER_YES_NO',
    };
  }

  if (input.sport === 'tennis') {
    const tennis = classifyTennisCompetition(text);
    return {
      competition: tennis.competition,
      competitionLevel: tennis.competitionLevel,
      grandSlamName: tennis.grandSlamName,
      eventType: text.includes('defeat') || text.includes(' vs ') || text.includes('match') ? 'MATCH' : 'TOURNAMENT',
      binaryMarketType: isDisallowedTennisText(text)
        ? 'DISALLOWED_PROP'
        : text.includes('defeat') || text.includes(' vs ') || text.includes('match')
          ? 'TENNIS_MATCH_WINNER'
          : 'TENNIS_TOURNAMENT_WINNER_YES_NO',
    };
  }

  if (input.sport === 'ufc') {
    return {
      competition: 'UFC',
      eventType: text.includes('main event') ? 'MAIN_EVENT' : text.includes('undercard') ? 'UNDERCARD' : 'UNSUPPORTED',
      binaryMarketType: text.includes('method') || text.includes('submission') || text.includes('round')
        ? 'DISALLOWED_METHOD'
        : 'UFC_MAIN_EVENT_FIGHT_WINNER',
    };
  }

  return {
    competition: 'FORMULA_1',
    eventType: text.includes('sprint') ? 'SPRINT' : text.includes('qualifying') ? 'QUALIFYING' : text.includes('season') ? 'SEASON' : 'RACE',
    binaryMarketType: text.includes('qualifying') ? 'DISALLOWED_QUALIFYING'
      : text.includes('fastest lap') ? 'DISALLOWED_FASTEST_LAP'
        : text.includes('podium') ? 'DISALLOWED_PODIUM'
          : text.includes('season') || text.includes('championship') && !text.includes('grand prix') ? 'DISALLOWED_SEASON'
            : text.includes('sprint') ? 'F1_SPRINT_WINNER_YES_NO'
              : 'F1_RACE_WINNER_YES_NO',
  };
}

function classifyTennisCompetition(text: string): {
  competition: Competition;
  competitionLevel?: CompetitionLevel;
  grandSlamName?: string;
} {
  if (text.includes('atp 250') || text.includes('atp250')) return { competition: 'ATP_250', competitionLevel: 'ATP_250' };
  if (text.includes('atp 500') || text.includes('atp500')) return { competition: 'ATP_500', competitionLevel: 'ATP_500' };
  if (text.includes('masters 1000')) return { competition: 'ATP_MASTERS_1000', competitionLevel: 'ATP_MASTERS_1000' };
  if (text.includes('atp finals')) return { competition: 'ATP_FINALS', competitionLevel: 'ATP_FINALS' };
  if (text.includes('wimbledon')) return { competition: 'GRAND_SLAM', competitionLevel: 'GRAND_SLAM', grandSlamName: 'Wimbledon' };
  if (text.includes('australian open')) return { competition: 'GRAND_SLAM', competitionLevel: 'GRAND_SLAM', grandSlamName: 'Australian Open' };
  if (text.includes('roland garros') || text.includes('french open')) return { competition: 'GRAND_SLAM', competitionLevel: 'GRAND_SLAM', grandSlamName: 'Roland Garros' };
  if (text.includes('us open')) return { competition: 'GRAND_SLAM', competitionLevel: 'GRAND_SLAM', grandSlamName: 'US Open' };
  if (text.includes('grand slam')) return { competition: 'GRAND_SLAM', competitionLevel: 'GRAND_SLAM' };
  return { competition: 'UNSUPPORTED' };
}

function isDisallowedPropText(text: string): boolean {
  return /\b(spread|handicap|total|corner|card|prop)\b/.test(text);
}

function isDisallowedTennisText(text: string): boolean {
  return /\b(spread|handicap|total games|aces?|retirement)\b/.test(text);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
