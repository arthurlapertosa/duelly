import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

export type TemplateCtfSyncStatus =
  | 'disabled'
  | 'missing-source-rpc'
  | 'missing-oracle'
  | 'non-local-fork-rpc'
  | 'invalid-chain-id'
  | 'invalid-template'
  | 'source-unresolved'
  | 'prepared'
  | 'already-resolved'
  | 'mirrored'
  | 'failed';

@Entity({ name: 'template_ctf_sync_statuses' })
export class TemplateCtfSyncStatusEntity {
  @PrimaryColumn({ type: 'text', name: 'condition_id' })
  conditionId!: string;

  @Column({ type: 'text', name: 'template_hash' })
  templateHash!: string;

  @Column({ type: 'text', name: 'template_id' })
  templateId!: string;

  @Column({ type: 'text' })
  status!: TemplateCtfSyncStatus;

  @Column({ type: 'text', name: 'source_denominator', nullable: true })
  sourceDenominator!: string | null;

  @Column({ type: 'text', name: 'fork_denominator', nullable: true })
  forkDenominator!: string | null;

  @Column({ type: 'text', name: 'prepare_transaction_hash', nullable: true })
  prepareTransactionHash!: string | null;

  @Column({ type: 'text', name: 'mirror_transaction_hash', nullable: true })
  mirrorTransactionHash!: string | null;

  @Column({ type: 'text', name: 'block_number', nullable: true })
  blockNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'timestamptz', name: 'checked_at' })
  checkedAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
