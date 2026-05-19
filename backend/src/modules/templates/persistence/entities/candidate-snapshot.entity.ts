import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'candidate_snapshots' })
export class CandidateSnapshotEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'discovery_run_id', nullable: true })
  discoveryRunId?: string | null;

  @Column({ type: 'text', name: 'fixture_id', nullable: true })
  fixtureId?: string | null;

  @Column({ type: 'text', name: 'provider_market_id' })
  providerMarketId!: string;

  @Column({ type: 'text', nullable: true })
  sport?: string | null;

  @Column({ type: 'jsonb' })
  candidate!: unknown;

  @Column({ type: 'text', name: 'raw_provider_payload_hash' })
  rawProviderPayloadHash!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
