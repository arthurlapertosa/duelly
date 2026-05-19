import { EntitySchema } from 'typeorm';

export interface RejectedCandidateRecord {
  id: string;
  candidateId?: string | null;
  fixtureId?: string | null;
  providerMarketId?: string | null;
  sport?: string | null;
  reasons: string[];
  candidate: unknown;
  rejectedAt: Date;
}

export const RejectedCandidateEntity = new EntitySchema<RejectedCandidateRecord>({
  name: 'RejectedCandidate',
  tableName: 'rejected_candidates',
  columns: {
    id: { type: String, primary: true },
    candidateId: { type: String, name: 'candidate_id', nullable: true },
    fixtureId: { type: String, name: 'fixture_id', nullable: true },
    providerMarketId: { type: String, name: 'provider_market_id', nullable: true },
    sport: { type: String, nullable: true },
    reasons: { type: 'text', array: true },
    candidate: { type: 'jsonb' },
    rejectedAt: { type: 'timestamptz', name: 'rejected_at' },
  },
});
