import type {
  BinaryMarketType,
  Competition,
  EventType,
  LocalizedTemplateDisplay,
  Outcome,
  Sport,
} from '../domain/types.js';

export interface TemplateDisplayInput {
  question: string;
  sport: Sport;
  competition: Competition;
  eventType: EventType;
  binaryMarketType: BinaryMarketType;
  outcomeA: Outcome;
  outcomeB: Outcome;
  participants?: string[];
}

export function buildPtBRTemplateDisplay(input: TemplateDisplayInput): LocalizedTemplateDisplay {
  return {
    question: buildPtBRQuestion(input),
    rulesSummary: buildPtBRRulesSummary(input),
    outcomes: [localizeOutcome(input.outcomeA.label), localizeOutcome(input.outcomeB.label)],
  };
}

function buildPtBRQuestion(input: TemplateDisplayInput): string {
  const footballMatchCondition = input.sport === 'football' ? parseFootballMatchCondition(input.question) : undefined;
  if (footballMatchCondition) return footballMatchCondition;

  const f1HeadToHead = input.sport === 'f1' ? parseF1HeadToHeadQuestion(input.question) : undefined;
  if (f1HeadToHead) return f1HeadToHead;

  const f1RedFlag = input.sport === 'f1' ? parseF1RedFlagQuestion(input.question) : undefined;
  if (f1RedFlag) return f1RedFlag;

  if (isDirectParticipantMarket(input)) return localizeStructuralQuestion(input.question);

  const yesNoWinner = parseYesNoWinnerQuestion(input.question);
  if (yesNoWinner) {
    const participant = input.participants?.[0] ?? yesNoWinner.participant;
    const target = localizeEventName(yesNoWinner.target, input);
    if (participant && target) return `${participant} vence ${target}?`;
  }

  return input.question;
}

function buildPtBRRulesSummary(input: TemplateDisplayInput): string {
  if (input.sport === 'f1' && parseF1RedFlagQuestion(input.question)) {
    return 'O registro oficial de bandeira vermelha durante a corrida decide o duelo. Cancelamento ou ausência de resultado oficial anula o duelo.';
  }

  switch (input.binaryMarketType) {
    case 'TENNIS_MATCH_WINNER':
      return 'O vencedor oficial da partida decide o duelo. Cancelamento, WO, desistência sem vencedor oficial ou ausência de resultado oficial anula o duelo.';
    case 'TENNIS_TOURNAMENT_WINNER_YES_NO':
      return 'O campeão oficial do torneio decide o duelo. Cancelamento ou ausência de campeão oficial anula o duelo.';
    case 'UFC_MAIN_EVENT_FIGHT_WINNER':
      return 'O vencedor oficial da luta principal decide o duelo. Empate, no-contest, cancelamento ou ausência de vencedor oficial anula o duelo.';
    case 'F1_RACE_WINNER_YES_NO':
      return 'A classificação oficial da corrida decide o duelo. Cancelamento ou ausência de classificação oficial anula o duelo.';
    case 'F1_SPRINT_WINNER_YES_NO':
      return 'A classificação oficial da sprint decide o duelo. Cancelamento ou ausência de classificação oficial anula o duelo.';
    case 'F1_RACE_OR_SPRINT_HEAD_TO_HEAD':
      return 'A classificação oficial da corrida ou sprint decide o duelo. Cancelamento ou ausência de classificação oficial anula o duelo.';
    case 'FOOTBALL_TOURNAMENT_WINNER_YES_NO':
      return 'O campeão oficial da competição decide o duelo. Cancelamento ou ausência de campeão oficial anula o duelo.';
    case 'FOOTBALL_BINARY_MATCH_CONDITION':
      return 'O resultado oficial da partida decide o duelo. Cancelamento ou ausência de resultado oficial anula o duelo.';
    default:
      return 'O resultado oficial decide o duelo. Se não houver resultado oficial, o duelo é anulado.';
  }
}

function parseFootballMatchCondition(question: string): string | undefined {
  const bothTeamsToScore = /^(.+?)\s+vs\.?\s+(.+?):\s+Both Teams to Score\??$/i.exec(question.trim());
  if (bothTeamsToScore?.[1] && bothTeamsToScore[2]) {
    return `${bothTeamsToScore[1].trim()} x ${bothTeamsToScore[2].trim()}: Ambos marcam?`;
  }
  return undefined;
}

function parseF1HeadToHeadQuestion(question: string): string | undefined {
  const match = /^Who will finish higher:\s*(.+?)\s+or\s+(.+?)\??$/i.exec(question.trim());
  if (!match?.[1] || !match[2]) return undefined;
  return `Quem termina melhor: ${match[1].trim()} ou ${match[2].trim()}?`;
}

function parseF1RedFlagQuestion(question: string): string | undefined {
  const match = /^Will there be a red flag during\s+(?:the\s+)?(.+?)\??$/i.exec(question.trim());
  if (!match?.[1]) return undefined;
  return `Haverá bandeira vermelha durante ${localizeEventName(match[1].trim(), {
    question,
    sport: 'f1',
    competition: 'FORMULA_1',
    eventType: 'RACE',
    binaryMarketType: 'F1_RACE_WINNER_YES_NO',
    outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
    outcomeB: { label: 'No', providerOutcomeIndex: 1 },
  })}?`;
}

function isDirectParticipantMarket(input: TemplateDisplayInput): boolean {
  return !isYesNoOutcome(input.outcomeA.label)
    && !isYesNoOutcome(input.outcomeB.label)
    && /\b(vs\.?|versus)\b/i.test(input.question);
}

function localizeStructuralQuestion(question: string): string {
  return question
    .replace(/\bQualification\b/gi, 'Qualificação')
    .replace(/\bQualifying\b/gi, 'Classificação')
    .replace(/\bMain Event\b/gi, 'Luta principal')
    .replace(/\bMain Card\b/gi, 'Card principal')
    .replace(/\s+(?:vs\.?|versus)\s+/gi, ' x ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseYesNoWinnerQuestion(question: string): { participant: string; target: string } | undefined {
  const match = /^Will\s+(.+?)\s+win\s+(?:the\s+)?(.+?)\??$/i.exec(question.trim());
  if (!match?.[1] || !match[2]) return undefined;
  return {
    participant: match[1].trim(),
    target: match[2].trim(),
  };
}

function localizeEventName(value: string, input: TemplateDisplayInput): string {
  const normalized = value.trim().replace(/\?$/, '');
  const f1Prefix = /^(?:F1|Formula 1)\s+(.+)$/i.exec(normalized);
  if (f1Prefix?.[1]) return localizeEventName(f1Prefix[1], input);

  const yearPrefix = /^(\d{4})\s+(.+)$/i.exec(normalized);
  if (yearPrefix?.[1] && yearPrefix[2]) {
    return `${localizeEventName(yearPrefix[2], input)} de ${yearPrefix[1]}`;
  }

  const yearSuffix = /^(.+?)\s+(\d{4})$/i.exec(normalized);
  if (yearSuffix?.[1] && yearSuffix[2]) {
    return `${localizeEventName(yearSuffix[1], input)} ${yearSuffix[2]}`;
  }

  const lower = normalized.toLowerCase();
  if (lower === 'fifa world cup') return 'a Copa do Mundo FIFA';
  if (lower === 'fifa club world cup') return 'a Copa do Mundo de Clubes FIFA';
  if (lower === 'copa libertadores') return 'a Copa Libertadores';
  if (lower === 'brasileirão' || lower === 'brasileirao') return 'o Brasileirão';
  if (lower === 'wimbledon') return 'Wimbledon';
  if (lower === 'australian open') return 'o Australian Open';
  if (lower === 'roland garros' || lower === 'french open') return 'Roland Garros';
  if (lower === 'us open') return 'o US Open';

  const sprint = /^(.+?)\s+sprint race$/i.exec(normalized);
  if (sprint?.[1]) return `a sprint ${grandPrixLocationPreposition(sprint[1])}`;

  const grandPrix = /^(.+?)\s+Grand Prix$/i.exec(normalized);
  if (grandPrix?.[1]) return `o GP ${grandPrixLocationPreposition(grandPrix[1])}`;

  if (input.competition === 'FORMULA_1' && lower.includes('sprint')) return 'a sprint';
  if (input.competition === 'FORMULA_1') return 'a corrida';

  return withPortugueseArticle(normalized, input);
}

function grandPrixLocationPreposition(location: string): string {
  const trimmed = location.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'brazil') return 'do Brasil';
  if (lower === 'austria') return 'da Áustria';
  if (lower === 'canada' || lower === 'canadian') return 'do Canadá';
  if (lower === 'monaco') return 'de Mônaco';
  if (lower === 'united states' || lower === 'usa') return 'dos Estados Unidos';
  if (lower === 'great britain' || lower === 'british') return 'da Grã-Bretanha';
  if (lower === 'italy') return 'da Itália';
  if (lower === 'spain') return 'da Espanha';
  if (lower === 'mexico') return 'do México';
  return `de ${trimmed}`;
}

function withPortugueseArticle(value: string, input: TemplateDisplayInput): string {
  if (/^(a|o|os|as)\s+/i.test(value)) return value;
  if (input.sport === 'football' || input.sport === 'f1') return `a ${value}`;
  return value;
}

function localizeOutcome(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'yes') return 'Sim';
  if (normalized === 'no') return 'Não';
  return label.trim();
}

function isYesNoOutcome(label: string): boolean {
  return /^(yes|no)$/i.test(label.trim());
}
