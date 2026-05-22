import type { BetStatus, BetSummaryView, Hex, IndexedBetView, InviteView, PendingInviteView, TemplateView } from './types';

interface ApiOutcome {
  label: string;
  providerOutcomeIndex: number;
}

interface ApiLocalizedTemplateDisplay {
  question: string;
  rulesSummary: string;
  outcomes: [string, string];
}

interface ApiTemplate {
  templateId: string;
  templateHash: Hex;
  conditionId: Hex;
  sport: TemplateView['category'];
  display: { question: string; sourceUrl?: string; ptBR?: ApiLocalizedTemplateDisplay };
  outcomeA: ApiOutcome;
  outcomeB: ApiOutcome;
  bettingCloseAt: number;
  resolutionDeadline: number;
  loserFeeBps: number;
  active: boolean;
}

export function mapTemplate(template: ApiTemplate): TemplateView {
  return {
    id: template.templateId,
    templateHash: template.templateHash,
    conditionId: template.conditionId,
    title: template.display.question,
    category: template.sport,
    source: 'Polymarket',
    rulesSummary: template.display.question,
    outcomes: [normalizeOutcome(template.outcomeA.label), normalizeOutcome(template.outcomeB.label)],
    display: template.display.ptBR ? { ptBR: mapLocalizedDisplay(template.display.ptBR) } : undefined,
    outcomeIndexes: [template.outcomeA.providerOutcomeIndex, template.outcomeB.providerOutcomeIndex],
    bettingCloseAt: new Date(template.bettingCloseAt * 1000).toISOString(),
    resolutionDeadline: new Date(template.resolutionDeadline * 1000).toISOString(),
    loserFeeBps: template.loserFeeBps,
    active: template.active,
  };
}

function mapLocalizedDisplay(display: ApiLocalizedTemplateDisplay): NonNullable<TemplateView['display']>['ptBR'] {
  return {
    question: display.question,
    rulesSummary: display.rulesSummary,
    outcomes: [display.outcomes[0], display.outcomes[1]],
  };
}

export function mapInvite(invite: Record<string, unknown>): InviteView {
  return {
    id: String(invite.id),
    status: String(invite.status) as InviteView['status'],
    isRecipientRestricted: Boolean(invite.isRecipientRestricted),
    recipientEmailHint: invite.recipientEmailHint ? String(invite.recipientEmailHint) : null,
    recipientAccess: invite.recipientAccess === 'allowed' || invite.recipientAccess === 'blocked' || invite.recipientAccess === 'unknown'
      ? invite.recipientAccess
      : 'open',
    templateHash: String(invite.templateHash) as Hex,
    conditionId: String(invite.conditionId) as Hex,
    makerAddress: String(invite.makerAddress) as Hex,
    takerAddress: invite.takerAddress ? String(invite.takerAddress) as Hex : null,
    makerOutcomeIndex: Number(invite.makerOutcomeIndex),
    takerOutcomeIndex: invite.takerOutcomeIndex === null || invite.takerOutcomeIndex === undefined ? null : Number(invite.takerOutcomeIndex),
    stakeRaw: String(invite.stakeRaw),
    loserFeeRaw: String(invite.loserFeeRaw),
    expiresAt: String(invite.expiresAt),
    betId: invite.betId ? String(invite.betId) : null,
  };
}

export function mapPendingInvite(item: Record<string, unknown>): PendingInviteView {
  return {
    invite: mapInvite(item.invite as Record<string, unknown>),
    template: item.template ? mapTemplate(item.template as ApiTemplate) : null,
    requiredFundingRaw: String(item.requiredFundingRaw),
  };
}

export function mapIndexedBet(bet: Record<string, unknown>): IndexedBetView {
  return {
    betId: String(bet.betId),
    inviteId: bet.inviteId ? String(bet.inviteId) : null,
    templateHash: String(bet.templateHash) as Hex,
    conditionId: String(bet.conditionId) as Hex,
    playerA: String(bet.playerA) as Hex,
    playerB: String(bet.playerB) as Hex,
    playerAOutcomeIndex: Number(bet.playerAOutcomeIndex),
    playerBOutcomeIndex: Number(bet.playerBOutcomeIndex),
    stakeRaw: String(bet.stake),
    loserFeeRaw: String(bet.loserFee),
    status: String(bet.status) as IndexedBetView['status'],
    winner: bet.winner ? String(bet.winner) as Hex : null,
    winnerPayoutRaw: bet.winnerPayout ? String(bet.winnerPayout) : null,
    treasuryPayoutRaw: bet.treasuryPayout ? String(bet.treasuryPayout) : null,
    updatedAt: String(bet.updatedAt),
  };
}

export function mapBetSummary(item: Record<string, unknown>): BetSummaryView {
  const invite = mapInvite(item.invite as Record<string, unknown>);
  return {
    role: String(item.role) === 'taker' ? 'taker' : 'maker',
    invite,
    template: item.template ? mapTemplate(item.template as ApiTemplate) : null,
    requiredFundingRaw: String(item.requiredFundingRaw),
    bet: item.bet ? mapIndexedBet(item.bet as Record<string, unknown>) : null,
  };
}

export function deriveBetStatus(summary: BetSummaryView): BetStatus {
  if (summary.bet) return summary.bet.status;
  if (inviteHasExpired(summary.invite)) return 'Expired';
  if (summary.invite.status === 'funded') return 'Funded';
  if (summary.invite.status === 'accepted') return 'Accepted';
  if (summary.invite.status === 'funding_submitted') return 'FundingSubmitted';
  if (summary.invite.status === 'expired') return 'Expired';
  if (summary.invite.status === 'cancelled') return 'Expired';
  return 'InviteCreated';
}

export function inviteHasExpired(invite: Pick<InviteView, 'betId' | 'expiresAt' | 'status'>, now = Date.now()): boolean {
  if (invite.betId || invite.status === 'funded') return false;
  const expiresAt = Date.parse(invite.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

function normalizeOutcome(value: string): string {
  if (value.toLowerCase() === 'yes') return 'Yes';
  if (value.toLowerCase() === 'no') return 'No';
  return value;
}
