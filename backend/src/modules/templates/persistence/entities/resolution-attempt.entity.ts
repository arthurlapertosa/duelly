import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'resolution_attempts' })
export class ResolutionAttemptEntity {
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
