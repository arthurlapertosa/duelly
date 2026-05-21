import type { Address, Hex } from 'viem';

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
  address: Address;
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
  address: Address;
  chainId: number;
  active: boolean;
  verifiedAt: Date;
  createdAt: Date;
}

export type InviteStatus = 'draft' | 'created' | 'accepted' | 'funding_submitted' | 'funded' | 'expired';

export interface StoredPermit {
  value: string;
  nonce: string;
  deadline: string;
  v: number;
  r: Hex;
  s: Hex;
}

export interface BetInvite {
  id: string;
  makerUserId: string;
  takerUserId: string | null;
  templateHash: Hex;
  conditionId: Hex;
  makerAddress: Address;
  takerAddress: Address | null;
  makerOutcomeIndex: number;
  takerOutcomeIndex: number | null;
  stake: string;
  loserFee: string;
  offerNonce: string;
  acceptanceNonce: string | null;
  offerHash: Hex;
  offerPayload: unknown;
  offerSignature: Hex | null;
  makerPermit: StoredPermit | null;
  makerAuthorizedAt: Date | null;
  acceptancePayload: unknown | null;
  acceptanceSignature: Hex | null;
  takerPermit: StoredPermit | null;
  takerAuthorizedAt: Date | null;
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
  transactionHash: Hex | null;
  betId: string | null;
  error: string | null;
  payload: unknown | null;
  createdAt: Date;
}

export interface IndexedChainEvent {
  id: string;
  eventName: string;
  transactionHash: Hex;
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
  playerA: Address;
  playerB: Address;
  playerAOutcomeIndex: number;
  playerBOutcomeIndex: number;
  stake: string;
  loserFee: string;
  status: 'Funded' | 'Resolved' | 'Voided' | 'Expired';
  winner: Address | null;
  winnerPayout: string | null;
  treasuryPayout: string | null;
  sourceTransactionHash: Hex;
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
  transactionHash: Hex | null;
  blockNumber: string | null;
  error: string | null;
  createdAt: Date;
}
