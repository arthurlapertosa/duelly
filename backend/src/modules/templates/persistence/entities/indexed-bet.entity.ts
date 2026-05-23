import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'indexed_bets' })
export class IndexedBetEntity {
  @PrimaryColumn({ type: 'text', name: 'deployment_key' })
  deploymentKey!: string;

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
