import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'rejected_candidates' })
export class RejectedCandidateEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'candidate_id', nullable: true })
  candidateId?: string | null;

  @Column({ type: 'text', name: 'fixture_id', nullable: true })
  fixtureId?: string | null;

  @Column({ type: 'text', name: 'provider_market_id', nullable: true })
  providerMarketId?: string | null;

  @Column({ type: 'text', nullable: true })
  sport?: string | null;

  @Column({ type: 'text', array: true })
  reasons!: string[];

  @Column({ type: 'jsonb' })
  candidate!: unknown;

  @Column({ type: 'timestamptz', name: 'rejected_at' })
  rejectedAt!: Date;
}
