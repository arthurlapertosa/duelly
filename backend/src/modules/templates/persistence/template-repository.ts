import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import type {
  CandidateSnapshotRecord,
  DiscoveryRunRecord,
  RejectedCandidateRecord,
  SportsTemplateRecord,
  TemplatePublishAuditRecord,
} from './entities/index.js';
import type { CanonicalSportsTemplate, NormalizedMarketCandidate, PublishableTemplatePayload, RejectedCandidate } from '../domain/types.js';

export class TemplateRepository {
  constructor(private readonly dataSource?: DataSource) {}

  get enabled(): boolean {
    return Boolean(this.dataSource?.isInitialized);
  }

  async recordDiscoveryRun(input: Pick<DiscoveryRunRecord, 'mode' | 'sport' | 'provider' | 'status' | 'gammaBaseUrl'>): Promise<string | undefined> {
    if (!this.enabled) return undefined;
    const id = `discovery-${randomUUID()}`;
    await this.dataSource!.getRepository<DiscoveryRunRecord>('DiscoveryRun').save({
      ...input,
      id,
      startedAt: new Date(),
      finishedAt: new Date(),
      error: null,
    });
    return id;
  }

  async saveCandidates(candidates: NormalizedMarketCandidate[], discoveryRunId?: string): Promise<void> {
    if (!this.enabled) return;
    const records: CandidateSnapshotRecord[] = candidates.map((candidate) => ({
      id: `candidate-${candidate.id}-${randomUUID()}`,
      discoveryRunId,
      fixtureId: candidate.id.startsWith('fixture-') ? candidate.id : null,
      providerMarketId: candidate.providerMarketId,
      sport: candidate.sport ?? null,
      candidate,
      rawProviderPayloadHash: candidate.rawProviderPayloadHash,
      createdAt: new Date(),
    }));
    await this.dataSource!.getRepository<CandidateSnapshotRecord>('CandidateSnapshot').save(records);
  }

  async saveAcceptedTemplates(templates: CanonicalSportsTemplate[]): Promise<void> {
    if (!this.enabled) return;
    const records: SportsTemplateRecord[] = templates.map((template) => ({
      templateHash: template.templateHash,
      templateId: template.templateId,
      providerMarketId: template.providerMarketId,
      sport: template.sport,
      competition: template.competition,
      eventType: template.eventType,
      binaryMarketType: template.binaryMarketType,
      conditionId: template.conditionId,
      questionIdHash: template.questionIdHash,
      template,
      active: template.active,
      acceptedAt: new Date(),
    }));
    await this.dataSource!.getRepository<SportsTemplateRecord>('SportsTemplate').upsert(
      records as QueryDeepPartialEntity<SportsTemplateRecord>[],
      ['templateHash'],
    );
  }

  async saveRejectedCandidates(rejected: RejectedCandidate[]): Promise<void> {
    if (!this.enabled) return;
    const records: RejectedCandidateRecord[] = rejected.map((item) => ({
      id: `rejected-${item.candidate.id}-${randomUUID()}`,
      candidateId: item.candidate.id,
      fixtureId: item.candidate.id.startsWith('fixture-') ? item.candidate.id : null,
      providerMarketId: item.candidate.providerMarketId,
      sport: item.candidate.sport ?? null,
      reasons: item.reasons,
      candidate: item.candidate,
      rejectedAt: new Date(),
    }));
    await this.dataSource!.getRepository<RejectedCandidateRecord>('RejectedCandidate').save(records);
  }

  async savePublishAudit(template: CanonicalSportsTemplate, payload: PublishableTemplatePayload): Promise<void> {
    if (!this.enabled) return;
    const record: TemplatePublishAuditRecord = {
      id: `publish-${template.templateId}-${randomUUID()}`,
      templateHash: template.templateHash,
      templateId: template.templateId,
      status: payload.status,
      publishedBy: payload.audit.publishedBy,
      payload,
      audit: payload.audit,
      createdAt: new Date(),
    };
    await this.dataSource!.getRepository<TemplatePublishAuditRecord>('TemplatePublishAudit').save(record);
  }
}
