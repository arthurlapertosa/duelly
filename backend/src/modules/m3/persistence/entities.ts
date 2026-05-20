import 'reflect-metadata';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'm3_users' })
export class M3UserEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', name: 'display_identifier' })
  displayIdentifier!: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'm3_sessions' })
export class M3SessionEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;
}

@Entity({ name: 'm3_wallet_challenges' })
export class M3WalletChallengeEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'integer', name: 'chain_id' })
  chainId!: number;

  @Column({ type: 'text' })
  nonce!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
  usedAt!: Date | null;
}

@Entity({ name: 'm3_wallets' })
export class M3WalletEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'integer', name: 'chain_id' })
  chainId!: number;

  @Column({ type: 'boolean' })
  active!: boolean;

  @Column({ type: 'timestamptz', name: 'verified_at' })
  verifiedAt!: Date;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

@Entity({ name: 'm3_invites' })
export class M3InviteEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'maker_user_id' })
  makerUserId!: string;

  @Column({ type: 'text', name: 'taker_user_id', nullable: true })
  takerUserId!: string | null;

  @Column({ type: 'text', name: 'template_hash' })
  templateHash!: string;

  @Column({ type: 'text', name: 'condition_id' })
  conditionId!: string;

  @Column({ type: 'text', name: 'maker_address' })
  makerAddress!: string;

  @Column({ type: 'text', name: 'taker_address', nullable: true })
  takerAddress!: string | null;

  @Column({ type: 'integer', name: 'maker_outcome_index' })
  makerOutcomeIndex!: number;

  @Column({ type: 'integer', name: 'taker_outcome_index', nullable: true })
  takerOutcomeIndex!: number | null;

  @Column({ type: 'text' })
  stake!: string;

  @Column({ type: 'text', name: 'loser_fee' })
  loserFee!: string;

  @Column({ type: 'text', name: 'offer_nonce' })
  offerNonce!: string;

  @Column({ type: 'text', name: 'acceptance_nonce', nullable: true })
  acceptanceNonce!: string | null;

  @Column({ type: 'text', name: 'offer_hash' })
  offerHash!: string;

  @Column({ type: 'jsonb', name: 'offer_payload' })
  offerPayload!: unknown;

  @Column({ type: 'jsonb', name: 'acceptance_payload', nullable: true })
  acceptancePayload!: unknown | null;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', name: 'bet_id', nullable: true })
  betId!: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'm3_relayer_attempts' })
export class M3RelayerAttemptEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'request_id' })
  requestId!: string;

  @Column({ type: 'text', name: 'invite_id', nullable: true })
  inviteId!: string | null;

  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', name: 'transaction_hash', nullable: true })
  transactionHash!: string | null;

  @Column({ type: 'text', name: 'bet_id', nullable: true })
  betId!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload!: unknown | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

@Entity({ name: 'm3_indexed_events' })
export class M3IndexedEventEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'event_name' })
  eventName!: string;

  @Column({ type: 'text', name: 'transaction_hash' })
  transactionHash!: string;

  @Column({ type: 'integer', name: 'log_index' })
  logIndex!: number;

  @Column({ type: 'text', name: 'block_number' })
  blockNumber!: string;

  @Column({ type: 'jsonb' })
  args!: unknown;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

@Entity({ name: 'm3_indexed_bets' })
export class M3IndexedBetEntity {
  @PrimaryColumn({ type: 'text', name: 'bet_id' })
  betId!: string;

  @Column({ type: 'text', name: 'invite_id', nullable: true })
  inviteId!: string | null;

  @Column({ type: 'text', name: 'template_hash' })
  templateHash!: string;

  @Column({ type: 'text', name: 'condition_id' })
  conditionId!: string;

  @Column({ type: 'text', name: 'player_a' })
  playerA!: string;

  @Column({ type: 'text', name: 'player_b' })
  playerB!: string;

  @Column({ type: 'integer', name: 'player_a_outcome_index' })
  playerAOutcomeIndex!: number;

  @Column({ type: 'integer', name: 'player_b_outcome_index' })
  playerBOutcomeIndex!: number;

  @Column({ type: 'text' })
  stake!: string;

  @Column({ type: 'text', name: 'loser_fee' })
  loserFee!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  winner!: string | null;

  @Column({ type: 'text', name: 'winner_payout', nullable: true })
  winnerPayout!: string | null;

  @Column({ type: 'text', name: 'treasury_payout', nullable: true })
  treasuryPayout!: string | null;

  @Column({ type: 'text', name: 'source_transaction_hash' })
  sourceTransactionHash!: string;

  @Column({ type: 'text', name: 'source_block_number' })
  sourceBlockNumber!: string;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'm3_indexer_cursors' })
export class M3IndexerCursorEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'last_block_number' })
  lastBlockNumber!: string;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'm3_resolution_attempts' })
export class M3ResolutionAttemptEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'bet_id' })
  betId!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', name: 'transaction_hash', nullable: true })
  transactionHash!: string | null;

  @Column({ type: 'text', name: 'block_number', nullable: true })
  blockNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

export const m3Entities = [
  M3UserEntity,
  M3SessionEntity,
  M3WalletChallengeEntity,
  M3WalletEntity,
  M3InviteEntity,
  M3RelayerAttemptEntity,
  M3IndexedEventEntity,
  M3IndexedBetEntity,
  M3IndexerCursorEntity,
  M3ResolutionAttemptEntity,
];
