export interface User {
  id: string
  name: string
  walletAddress: string
  balanceBRL1: number
}

export type AuthProvider = 'password' | 'google'

export interface AuthSession {
  provider: AuthProvider
  email: string
  loggedAt: string
}

export type AuthResult =
  | { success: true }
  | { success: false; error: string }

export interface Template {
  id: string
  templateHash: string
  conditionId: string
  title: string
  category: 'collectibles' | 'sports'
  source: 'Polymarket'
  rulesSummary: string
  outcomes: [string, string]
  bettingCloseAt: string
  resolutionDeadline: string
  loserFeeBps: number
  active: boolean
}

export type BetStatus =
  | 'InviteCreated'
  | 'InviteAcceptedPendingTx'
  | 'Funded'
  | 'Resolved'
  | 'Voided'
  | 'Expired'

export interface Bet {
  id: string
  templateId: string
  playerAId: string
  playerBId?: string
  playerAOutcomeIndex: number
  playerBOutcomeIndex?: number
  stake: number
  loserFee: number
  status: BetStatus
  winnerId?: string
  treasuryPayout?: number
  winnerPayout?: number
  createdAt: string
  fundedAt?: string
  resolvedAt?: string
  inviteCode: string
}

export type ActivityType =
  | 'deposit'
  | 'withdrawal'
  | 'bet_created'
  | 'bet_accepted'
  | 'bet_funded'
  | 'bet_won'
  | 'bet_lost'
  | 'refund'

export type WithdrawStatus = 'processing' | 'brl1_burned' | 'pix_sent'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  amount?: number
  timestamp: string
  betId?: string
}

export type DepositStatus = 'awaiting_pix' | 'pix_confirmed' | 'brl1_received'

export interface Deposit {
  id: string
  amountBRL: number
  status: DepositStatus
  createdAt: string
}
