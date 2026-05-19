import { EntitySchema } from 'typeorm';

export interface DiscoveryRunRecord {
  id: string;
  mode: string;
  sport?: string | null;
  provider: string;
  status: string;
  gammaBaseUrl?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
  error?: string | null;
}

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

export interface SportsTemplateRecord {
  templateHash: string;
  templateId: string;
  providerMarketId: string;
  sport: string;
  competition: string;
  eventType: string;
  binaryMarketType: string;
  conditionId: string;
  questionIdHash: string;
  template: unknown;
  active: boolean;
  acceptedAt: Date;
}

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

export interface TemplatePublishAuditRecord {
  id: string;
  templateHash: string;
  templateId: string;
  status: string;
  publishedBy: string;
  payload: unknown;
  audit: unknown;
  createdAt: Date;
}

export const DiscoveryRunEntity = new EntitySchema<DiscoveryRunRecord>({
  name: 'DiscoveryRun',
  tableName: 'discovery_runs',
  columns: {
    id: { type: String, primary: true },
    mode: { type: String },
    sport: { type: String, nullable: true },
    provider: { type: String },
    status: { type: String },
    gammaBaseUrl: { type: String, name: 'gamma_base_url', nullable: true },
    startedAt: { type: 'timestamptz', name: 'started_at' },
    finishedAt: { type: 'timestamptz', name: 'finished_at', nullable: true },
    error: { type: String, nullable: true },
  },
});

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

export const SportsTemplateEntity = new EntitySchema<SportsTemplateRecord>({
  name: 'SportsTemplate',
  tableName: 'sports_templates',
  columns: {
    templateHash: { type: String, primary: true, name: 'template_hash' },
    templateId: { type: String, name: 'template_id' },
    providerMarketId: { type: String, name: 'provider_market_id' },
    sport: { type: String },
    competition: { type: String },
    eventType: { type: String, name: 'event_type' },
    binaryMarketType: { type: String, name: 'binary_market_type' },
    conditionId: { type: String, name: 'condition_id' },
    questionIdHash: { type: String, name: 'question_id_hash' },
    template: { type: 'jsonb' },
    active: { type: Boolean },
    acceptedAt: { type: 'timestamptz', name: 'accepted_at' },
  },
});

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

export const TemplatePublishAuditEntity = new EntitySchema<TemplatePublishAuditRecord>({
  name: 'TemplatePublishAudit',
  tableName: 'template_publish_audits',
  columns: {
    id: { type: String, primary: true },
    templateHash: { type: String, name: 'template_hash' },
    templateId: { type: String, name: 'template_id' },
    status: { type: String },
    publishedBy: { type: String, name: 'published_by' },
    payload: { type: 'jsonb' },
    audit: { type: 'jsonb' },
    createdAt: { type: 'timestamptz', name: 'created_at' },
  },
});
