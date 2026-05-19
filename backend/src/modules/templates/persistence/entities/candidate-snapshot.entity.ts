import { EntitySchema } from 'typeorm';

export interface CandidateSnapshotRecord {
  id: string;
  discoveryRunId?: string | null;
  fixtureId?: string | null;
  providerMarketId: string;
  sport?: string | null;
  candidate: unknown;
  rawProviderPayloadHash: string;
  createdAt: Date;
}

export const CandidateSnapshotEntity = new EntitySchema<CandidateSnapshotRecord>({
  name: 'CandidateSnapshot',
  tableName: 'candidate_snapshots',
  columns: {
    id: { type: String, primary: true },
    discoveryRunId: { type: String, name: 'discovery_run_id', nullable: true },
    fixtureId: { type: String, name: 'fixture_id', nullable: true },
    providerMarketId: { type: String, name: 'provider_market_id' },
    sport: { type: String, nullable: true },
    candidate: { type: 'jsonb' },
    rawProviderPayloadHash: { type: String, name: 'raw_provider_payload_hash' },
    createdAt: { type: 'timestamptz', name: 'created_at' },
  },
});
