import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'relayer_attempts' })
export class RelayerAttemptEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'request_id' })
  requestId!: string;

  @Column({ type: 'text', name: 'deployment_key' })
  deploymentKey!: string;

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

  @Column({ type: 'timestamptz', name: 'locked_at', nullable: true })
  lockedAt!: Date | null;
}
