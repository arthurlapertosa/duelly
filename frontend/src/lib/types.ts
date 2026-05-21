export type Locale = 'pt-BR' | 'en-US';
export type ApiMode = 'fixture' | 'http';
export type Hex = `0x${string}`;

export interface UserView {
  id: string;
  displayIdentifier: string;
}

export interface WalletView {
  address: Hex;
  chainId: number;
  verificationStatus: 'verified' | 'inactive';
}

export interface BalanceView {
  wallet: Hex;
  token: Hex;
  symbol: string;
  decimals: number;
  balanceRaw: string;
  allowanceRaw: string;
  permitNonce: string;
  spender: Hex;
}

export interface FundingReadinessView extends BalanceView {
  stakeRaw: string;
  loserFeeRaw: string;
  requiredAmountRaw: string;
  availableAmountRaw: string;
  missingAmountRaw: string;
  canAttemptBet: boolean;
}

export interface TemplateView {
  id: string;
  templateHash: Hex;
  conditionId: Hex;
  title: string;
  category: 'football' | 'tennis' | 'ufc' | 'f1';
  source: string;
  rulesSummary: string;
  outcomes: [string, string];
  outcomeIndexes: [number, number];
  bettingCloseAt: string;
  resolutionDeadline: string;
  loserFeeBps: number;
  active: boolean;
}

export interface FeeQuoteView {
  stakeRaw: string;
  loserFeeBps: number;
  percentFeeRaw: string;
  gasAnchoredMinimumRaw: string;
  selectedLoserFeeRaw: string;
  totalRequiredAmountRaw: string;
}

export type InviteStatus = 'draft' | 'created' | 'accepted' | 'funding_submitted' | 'funded' | 'expired' | 'cancelled';

export interface InviteView {
  id: string;
  status: InviteStatus;
  isRecipientRestricted: boolean;
  recipientEmailHint: string | null;
  recipientAccess: 'open' | 'unknown' | 'allowed' | 'blocked';
  templateHash: Hex;
  conditionId: Hex;
  makerAddress: Hex;
  takerAddress: Hex | null;
  makerOutcomeIndex: number;
  takerOutcomeIndex: number | null;
  stakeRaw: string;
  loserFeeRaw: string;
  expiresAt: string;
  betId: string | null;
}

export type BetStatus = 'Funded' | 'Resolved' | 'Voided' | 'Expired' | 'InviteCreated' | 'Accepted' | 'FundingSubmitted';

export interface IndexedBetView {
  betId: string;
  inviteId: string | null;
  templateHash: Hex;
  conditionId: Hex;
  playerA: Hex;
  playerB: Hex;
  playerAOutcomeIndex: number;
  playerBOutcomeIndex: number;
  stakeRaw: string;
  loserFeeRaw: string;
  status: 'Funded' | 'Resolved' | 'Voided' | 'Expired';
  winner: Hex | null;
  winnerPayoutRaw: string | null;
  treasuryPayoutRaw: string | null;
  updatedAt: string;
}

export interface BetSummaryView {
  role: 'maker' | 'taker';
  invite: InviteView;
  template: TemplateView | null;
  requiredFundingRaw: string;
  bet: IndexedBetView | null;
}

export interface PendingInviteView {
  invite: InviteView;
  template: TemplateView | null;
  requiredFundingRaw: string;
}

export interface TypedPayload {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface PermitSubmission {
  value: string;
  nonce: string;
  deadline: string;
  v: number;
  r: Hex;
  s: Hex;
}

export interface WalletAdapter {
  label: string;
  connect(): Promise<Hex>;
  signMessage(address: Hex, message: string): Promise<Hex>;
  signTypedData(address: Hex, payload: TypedPayload): Promise<Hex>;
  signPermit(address: Hex, payload: TypedPayload): Promise<PermitSubmission>;
}
