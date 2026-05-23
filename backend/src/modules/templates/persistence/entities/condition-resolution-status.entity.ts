import { Column, Entity, PrimaryColumn } from 'typeorm';

export type PersistedConditionResolutionStatus = 'unknown' | 'unresolved' | 'resolved';

@Entity({ name: 'condition_resolution_statuses' })
export class ConditionResolutionStatusEntity {
  @PrimaryColumn({ type: 'text', name: 'condition_id' })
  conditionId!: string;

  @Column({ type: 'text' })
  status!: PersistedConditionResolutionStatus;

  @Column({ type: 'text', name: 'payout_denominator', nullable: true })
  payoutDenominator!: string | null;

  @Column({ type: 'text', nullable: true })
  source!: string | null;

  @Column({ type: 'timestamptz', name: 'checked_at' })
  checkedAt!: Date;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;
}
