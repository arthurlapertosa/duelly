import type { AppConfig } from '../../../config/env.js';
import type { BinaryMarketType, Competition, CompetitionLevel, EventType, NormalizedMarketCandidate, Outcome, Sport } from '../domain/types.js';
import { hashJson } from '../hashing/template-hash.service.js';

const searchTermsBySport: Record<Sport, string[]> = {
  football: ['FIFA World Cup', 'Brasileirão', 'Copa Libertadores'],
  tennis: ['ATP 250', 'ATP 500', 'ATP Masters 1000', 'ATP Finals', 'Grand Slam', 'Wimbledon'],
  ufc: ['UFC main event', 'UFC'],
  f1: ['Formula 1', 'F1 Grand Prix', 'F1 sprint winner'],
};

interface SportFeedDefinition {
  tagId?: number;
  tagSlug?: string;
  seriesSlug?: string;
}

const eventFeedsBySport: Partial<Record<Sport, SportFeedDefinition[]>> = {
  football: [
    { tagId: 102648 },
    { tagId: 102562 },
    { tagId: 102539 },
  ],
  tennis: [
    { seriesSlug: 'atp' },
    { seriesSlug: 'wta' },
  ],
  ufc: [
    { tagSlug: 'ufc' },
  ],
  f1: [
    { tagId: 435 },
  ],
};

type GammaMarket = Record<string, unknown>;
type GammaEvent = Record<string, unknown>;

export class GammaClient {
  constructor(private readonly config: AppConfig) {}

  async discoverMarkets(sport?: Sport): Promise<NormalizedMarketCandidate[]> {
    const sports = sport ? [sport] : (Object.keys(searchTermsBySport) as Sport[]);
    const candidates: NormalizedMarketCandidate[] = [];

    for (const sportName of sports) {
      const feedMarkets = await this.discoverFeedMarkets(sportName);
      candidates.push(...feedMarkets);

      for (const term of searchTermsBySport[sportName]) {
        const markets = await this.search(term);
        candidates.push(...markets
          .filter((market) => marketMatchesSport(market, sportName))
          .map((market) => this.normalizeMarket(market, sportName)));
      }
    }

    return sortBySoonestEndDate(dedupeCandidates(candidates));
  }

  private async discoverFeedMarkets(sport: Sport): Promise<NormalizedMarketCandidate[]> {
    const feeds = eventFeedsBySport[sport] ?? [];
    const candidates: NormalizedMarketCandidate[] = [];

    for (const feed of feeds) {
      const events = await this.fetchEvents(feed);
      for (const event of events) {
        const markets = Array.isArray(event.markets) ? event.markets as GammaMarket[] : [];
        candidates.push(...markets.map((market) => this.normalizeMarket(market, sport, event)));
      }
    }

    return candidates;
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

  private async fetchEvents(feed: SportFeedDefinition): Promise<GammaEvent[]> {
    const url = new URL('/events', this.config.polymarket.gammaBaseUrl);
    if (feed.tagId !== undefined) url.searchParams.set('tag_id', String(feed.tagId));
    if (feed.tagSlug) url.searchParams.set('tag_slug', feed.tagSlug);
    if (feed.seriesSlug) url.searchParams.set('series_slug', feed.seriesSlug);
    url.searchParams.set('active', 'true');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('end_date_min', new Date().toISOString());
    url.searchParams.set('limit', String(this.config.polymarket.maxResults));
    url.searchParams.set('order', 'startTime');
    url.searchParams.set('ascending', 'true');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.polymarket.timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Gamma API returned ${response.status}`);
      const json = await response.json() as unknown;
      if (Array.isArray(json)) return json as GammaEvent[];
      if (json && typeof json === 'object' && Array.isArray((json as { events?: unknown }).events)) {
        return (json as { events: GammaEvent[] }).events;
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeMarket(market: GammaMarket, sport: Sport, event?: GammaEvent): NormalizedMarketCandidate {
    const outcomes = parseStringArray(market.outcomes).map<Outcome>((label, index) => ({
      label,
      providerOutcomeIndex: index,
      tokenId: parseStringArray(market.clobTokenIds)[index],
    }));
    const question = stringField(market.question) ?? stringField(market.title) ?? stringField(event?.title) ?? 'Untitled Polymarket market';
    const providerMarketId = String(market.id ?? market.marketId ?? market.slug ?? question);
    const rulesText = stringField(market.rules) ?? stringField(market.description) ?? stringField(event?.description);
    const classificationRulesText = [
      stringField(market.rules),
      stringField(market.description),
      stringField(event?.description),
      stringField(market.resolutionSource),
      stringField(event?.resolutionSource),
    ].filter(Boolean).join(' ');
    const resolutionSource = stringField(market.resolutionSource) ?? stringField(event?.resolutionSource);
    const slug = stringField(market.slug) ?? stringField(event?.slug) ?? providerMarketId;
    const endDate = optionalString(market.endDate ?? market.endDateIso ?? event?.endDate);
    const eventStartAt = optionalString(
      market.gameStartTime
      ?? market.eventStartTime
      ?? event?.startTime
      ?? market.startDate
      ?? event?.startDate,
    );
    const sportMetadata = collectSportMetadataText(market, event);
    const marketIdentityText = [
      question,
      slug,
      stringField(market.groupItemTitle),
      stringField(market.title),
      stringField(event?.title),
      sportMetadata,
    ].filter(Boolean).join(' ');
    const classification = classifyLiveMarket({
      sport,
      marketText: marketIdentityText,
      rulesText: classificationRulesText,
      outcomeLabels: outcomes.map((outcome) => outcome.label),
    });

    return {
      id: `live-${providerMarketId}`,
      provider: 'polymarket',
      providerEventId: optionalString(market.eventId ?? event?.id),
      providerMarketId,
      slug,
      question,
      conditionId: optionalString(market.conditionId),
      questionId: optionalString(market.questionID ?? market.questionId),
      outcomes,
      outcomeTokenIds: parseStringArray(market.clobTokenIds),
      active: booleanField(market.active, booleanField(event?.active, false)),
      closed: booleanField(market.closed, booleanField(event?.closed, false)),
      archived: booleanField(market.archived, booleanField(event?.archived, false)),
      acceptingOrders: market.acceptingOrders === undefined ? undefined : Boolean(market.acceptingOrders),
      negRisk: booleanField(market.negRisk, booleanField(event?.negRisk, false)),
      endDate,
      eventStartAt,
      rulesText,
      rulesSourceUrl: optionalString(market.rulesSourceUrl),
      sourceUrl: `https://polymarket.com/event/${slug}`,
      sport,
      competition: classification.competition,
      competitionLevel: classification.competitionLevel,
      grandSlamName: classification.grandSlamName,
      eventType: classification.eventType,
      binaryMarketType: classification.binaryMarketType,
      participants: participantLabels(outcomes.map((outcome) => outcome.label)),
      resultSource: inferResultSource([question, classificationRulesText, resolutionSource].filter(Boolean).join(' ')),
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
  if (/\b(ambiguous|subjective)\b/.test(normalized)) {
    return 'ambiguous';
  }
  if (/\b(50-50|fifty[- ]fifty)\b/.test(normalized) && !hasDeterministicVoidFallback(normalized)) {
    return 'ambiguous';
  }
  if (/\b(resolve|resolves|resolution|official|winner|defeat|win|wins|otherwise)\b/.test(normalized)) {
    return 'official_result';
  }
  return 'unknown';
}

function classifyLiveMarket(input: { sport: Sport; marketText: string; rulesText: string; outcomeLabels: string[] }): {
  competition: Competition;
  competitionLevel?: CompetitionLevel;
  grandSlamName?: string;
  eventType: EventType;
  binaryMarketType: BinaryMarketType;
} {
  const text = normalizeSearchText(input.marketText);

  if (input.sport === 'football') {
    const competition: Competition =
      text.includes('club world cup') ? 'FIFA_CLUB_WORLD_CUP'
        : text.includes('world cup') ? 'FIFA_WORLD_CUP'
          : text.includes('brasileir') || text.includes('brazil serie a') || text.includes('brazilian serie a') ? 'BRASILEIRAO'
            : text.includes('libertadores') ? 'COPA_LIBERTADORES'
              : 'UNSUPPORTED';
    return {
      competition,
      eventType: isMatchText(text) ? 'MATCH' : 'TOURNAMENT',
      binaryMarketType: isDisallowedPropText(text)
        ? 'DISALLOWED_PROP'
        : isMatchText(text)
          ? 'FOOTBALL_BINARY_MATCH_CONDITION'
          : 'FOOTBALL_TOURNAMENT_WINNER_YES_NO',
    };
  }

  if (input.sport === 'tennis') {
    const tennis = classifyTennisCompetition(text);
    const directMatchWinner = isDirectTennisMatchWinnerText(text);
    return {
      competition: tennis.competition,
      competitionLevel: tennis.competitionLevel,
      grandSlamName: tennis.grandSlamName,
      eventType: directMatchWinner ? 'MATCH' : 'TOURNAMENT',
      binaryMarketType: isDisallowedTennisText(text)
        ? 'DISALLOWED_PROP'
        : directMatchWinner
          ? 'TENNIS_MATCH_WINNER'
          : 'TENNIS_TOURNAMENT_WINNER_YES_NO',
    };
  }

  if (input.sport === 'ufc') {
    const directFightWinner = isDirectUfcFightWinner(text, input.outcomeLabels);
    const headlineFight = text.includes('main event') || isUfcHeadlineFight(input.rulesText, input.outcomeLabels);
    return {
      competition: 'UFC',
      eventType: headlineFight ? 'MAIN_EVENT' : text.includes('prelim') || text.includes('undercard') ? 'UNDERCARD' : 'UNSUPPORTED',
      binaryMarketType: isDisallowedUfcText(text)
        ? 'DISALLOWED_METHOD'
        : directFightWinner
          ? 'UFC_MAIN_EVENT_FIGHT_WINNER'
          : 'UNKNOWN',
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
  if (text.includes('geneva open')) return { competition: 'ATP_250', competitionLevel: 'ATP_250' };
  if (text.includes('atp 500') || text.includes('atp500')) return { competition: 'ATP_500', competitionLevel: 'ATP_500' };
  if (text.includes('hamburg european open')) return { competition: 'ATP_500', competitionLevel: 'ATP_500' };
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
  return /\b(spread|handicap|props?|aces?|double faults?|tie[- ]?break|break points?)\b/.test(text)
    || /\b(total games?|game total|games? o\/u|match o\/u|over\/under|o\/u|totals?)\b/.test(text)
    || /\b(set winner|first set|second set|third set|fourth set|fifth set|set [0-9]+|win set|total sets?|number of sets)\b/.test(text)
    || /\b(completed match|match completed|match be completed|go(?:es)? the distance)\b/.test(text);
}

function isMatchText(text: string): boolean {
  return /\b(vs\.?|versus|defeat|match)\b/.test(text);
}

function isDirectTennisMatchWinnerText(text: string): boolean {
  return text.includes('defeat') || /\b(vs\.?|versus)\b/.test(text);
}

function isDisallowedUfcText(text: string): boolean {
  return /\b(method|submission|round|decision|distance|go(?:es)? the distance|inside the distance|ko\/tko|tko|knockout|points?)\b/.test(text);
}

function isDirectUfcFightWinner(text: string, outcomeLabels: string[]): boolean {
  return text.includes('ufc')
    && /\b(vs\.?|versus)\b/.test(text)
    && outcomeLabels.length === 2
    && outcomeLabels.every((label) => !isYesNoOutcome(label));
}

function isUfcHeadlineFight(rulesText: string, outcomeLabels: string[]): boolean {
  if (outcomeLabels.length !== 2) return false;
  const headlines = extractUfcHeadlinePairs(rulesText);
  return headlines.some(([left, right]) => {
    const leftOutcome = outcomeLabels.findIndex((label) => nameMatchesReference(label, left));
    const rightOutcome = outcomeLabels.findIndex((label) => nameMatchesReference(label, right));
    return leftOutcome !== -1
      && rightOutcome !== -1
      && leftOutcome !== rightOutcome
      && isAbbreviatedHeadlineReference(outcomeLabels[leftOutcome], left)
      && isAbbreviatedHeadlineReference(outcomeLabels[rightOutcome], right);
  });
}

function extractUfcHeadlinePairs(text: string): Array<[string, string]> {
  const normalized = normalizeSearchText(text);
  const pairs: Array<[string, string]> = [];
  const pattern = /\bufc(?:\s+[a-z0-9]+){0,5}:\s*([a-z0-9 .'_-]+?)\s+vs\.?\s+([a-z0-9 .'_-]+?)(?=\s*(?:\(|,|\.|;|$))/g;
  for (const match of normalized.matchAll(pattern)) {
    const left = match[1]?.trim();
    const right = match[2]?.trim();
    if (left && right) pairs.push([left, right]);
  }
  return pairs;
}

function nameMatchesReference(name: string, reference: string): boolean {
  const normalizedName = normalizePersonName(name);
  const normalizedReference = normalizePersonName(reference);
  if (!normalizedName || !normalizedReference) return false;
  if (normalizedName.includes(normalizedReference) || normalizedReference.includes(normalizedName)) return true;

  const nameTokens = new Set(normalizedName.split(' '));
  const referenceTokens = normalizedReference.split(' ').filter((token) => token.length >= 3);
  return referenceTokens.some((token) => nameTokens.has(token));
}

function normalizePersonName(value: string): string {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

function isAbbreviatedHeadlineReference(name: string, reference: string): boolean {
  const nameTokens = normalizePersonName(name).split(' ').filter(Boolean);
  const referenceTokens = normalizePersonName(reference).split(' ').filter((token) => !/^\d+$/.test(token));
  return referenceTokens.length > 0 && referenceTokens.length < nameTokens.length;
}

function isYesNoOutcome(label: string): boolean {
  return /^(yes|no)$/i.test(label.trim());
}

function participantLabels(labels: string[]): string[] {
  return labels.filter((label) => !isYesNoOutcome(label));
}

function hasDeterministicVoidFallback(text: string): boolean {
  return /\b(50-50|fifty[- ]fifty)\b/.test(text)
    && /\b(cancel(?:led|ed|lation)|postpon(?:ed|ement)|walkover|retirement|withdraw(?:al|s)?|no contest|void|abandon(?:ed|ment)|not played|draw|tie)\b/.test(text);
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

function booleanField(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function marketMatchesSport(market: GammaMarket, sport: Sport): boolean {
  const metadata = normalizeSearchText(collectSportMetadataText(market));
  if (!metadata) return false;

  if (sport === 'football') {
    return /\b(football|soccer|fifa|world cup|brasileir|brazil serie a|libertadores)\b/.test(metadata);
  }
  if (sport === 'tennis') {
    return /\b(tennis|atp|wta|grand slam|wimbledon|australian open|roland garros|french open|us open)\b/.test(metadata);
  }
  if (sport === 'ufc') {
    return /\bufc\b/.test(metadata);
  }
  return /\b(formula 1|formula one|f1|grand prix)\b/.test(metadata);
}

function collectSportMetadataText(market: GammaMarket, event?: GammaEvent): string {
  return [
    ...collectTagOrSeriesText(market.tags),
    ...collectTagOrSeriesText(market.series),
    ...collectTagOrSeriesText(market.category),
    ...collectTagOrSeriesText(market.sport),
    ...collectEventSportMetadata(market.events),
    ...collectTagOrSeriesText(event?.tags),
    ...collectTagOrSeriesText(event?.series),
    ...collectTagOrSeriesText(event?.category),
    ...collectTagOrSeriesText(event?.sport),
  ].join(' ');
}

function collectEventSportMetadata(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const event = item as GammaEvent;
    return [
      ...collectTagOrSeriesText(event.tags),
      ...collectTagOrSeriesText(event.series),
      ...collectTagOrSeriesText(event.category),
      ...collectTagOrSeriesText(event.sport),
    ];
  });
}

function collectTagOrSeriesText(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => collectTagOrSeriesText(item));
  if (typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  return [
    record.name,
    record.label,
    record.slug,
    record.ticker,
    record.title,
    record.tagSlug,
    record.seriesSlug,
  ].filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
    .map(String);
}

function dedupeCandidates(candidates: NormalizedMarketCandidate[]): NormalizedMarketCandidate[] {
  const byConditionOrMarket = new Map<string, NormalizedMarketCandidate>();
  for (const candidate of candidates) {
    const key = candidate.conditionId?.toLowerCase() ?? `${candidate.provider}:${candidate.providerMarketId}`;
    if (!byConditionOrMarket.has(key)) byConditionOrMarket.set(key, candidate);
  }
  return [...byConditionOrMarket.values()];
}

function sortBySoonestEndDate(candidates: NormalizedMarketCandidate[]): NormalizedMarketCandidate[] {
  return [...candidates].sort((left, right) => {
    const leftTime = Date.parse(left.endDate ?? '');
    const rightTime = Date.parse(right.endDate ?? '');
    return comparableTime(leftTime) - comparableTime(rightTime);
  });
}

function comparableTime(value: number): number {
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}
