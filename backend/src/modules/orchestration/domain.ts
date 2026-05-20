import type { Hex } from 'viem';

export interface UserAccount {
  id: string;
  email: string;
  displayIdentifier: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface WalletChallenge {
  id: string;
  userId: string;
  address: `0x${string}`;
  chainId: number;
  nonce: string;
  message: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}

export interface LinkedWallet {
  id: string;
  userId: string;
  address: `0x${string}`;
  chainId: number;
  active: boolean;
  verifiedAt: Date;
  createdAt: Date;
}

export type InviteStatus = 'created' | 'accepted' | 'funding_submitted' | 'funded' | 'expired';

export interface BetInvite {
  id: string;
  makerUserId: string;
  takerUserId: string | null;
  templateHash: Hex;
  conditionId: Hex;
  makerAddress: `0x${string}`;
  takerAddress: `0x${string}` | null;
  makerOutcomeIndex: number;
  takerOutcomeIndex: number | null;
  stake: string;
  loserFee: string;
  offerNonce: string;
  acceptanceNonce: string | null;
  offerHash: Hex;
  offerPayload: unknown;
  acceptancePayload: unknown | null;
  status: InviteStatus;
  betId: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelayerAttempt {
  id: string;
  requestId: string;
  inviteId: string | null;
  action: 'acceptBetWithPermits' | 'resolveFromPolymarket' | 'registerTemplate';
  status: 'submitted' | 'succeeded' | 'failed' | 'rejected';
  transactionHash: string | null;
  betId: string | null;
  error: string | null;
  payload: unknown | null;
  createdAt: Date;
}

export interface IndexedChainEvent {
  id: string;
  eventName: string;
  transactionHash: string;
  logIndex: number;
  blockNumber: string;
  args: unknown;
  createdAt: Date;
}

export interface IndexedBet {
  betId: string;
  inviteId: string | null;
  templateHash: Hex;
  conditionId: Hex;
  playerA: `0x${string}`;
  playerB: `0x${string}`;
  playerAOutcomeIndex: number;
  playerBOutcomeIndex: number;
  stake: string;
  loserFee: string;
  status: 'Funded' | 'Resolved' | 'Voided' | 'Expired';
  winner: `0x${string}` | null;
  winnerPayout: string | null;
  treasuryPayout: string | null;
  sourceTransactionHash: string;
  sourceBlockNumber: string;
  updatedAt: Date;
}

export interface IndexerCursor {
  id: string;
  lastBlockNumber: string;
  updatedAt: Date;
}

export interface ResolutionAttempt {
  id: string;
  betId: string;
  status: 'submitted' | 'resolved' | 'pending' | 'failed';
  transactionHash: string | null;
  blockNumber: string | null;
  error: string | null;
  createdAt: Date;
}
