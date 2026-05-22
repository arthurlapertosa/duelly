import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import {
  CandidateSnapshotEntity,
  ConditionResolutionStatusEntity,
  DiscoveryRunEntity,
  RejectedCandidateEntity,
  SportsTemplateEntity,
  TemplatePublishAuditEntity,
} from './entities/index.js';
import type { CanonicalSportsTemplate, NormalizedMarketCandidate, PublishableTemplatePayload, RejectedCandidate } from '../domain/types.js';

export class TemplateRepository {
  private readonly memoryAcceptedTemplates = new Map<string, CanonicalSportsTemplate>();

  constructor(private readonly dataSource?: DataSource) {}

  get enabled(): boolean {
    return Boolean(this.dataSource?.isInitialized);
  }

  async recordDiscoveryRun(input: Pick<DiscoveryRunEntity, 'mode' | 'sport' | 'provider' | 'status' | 'gammaBaseUrl'>): Promise<string | undefined> {
    if (!this.enabled) return undefined;
    const id = `discovery-${randomUUID()}`;
    await this.dataSource!.getRepository(DiscoveryRunEntity).save({
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
    const records: CandidateSnapshotEntity[] = candidates.map((candidate) => ({
      id: `candidate-${candidate.id}-${randomUUID()}`,
      discoveryRunId,
      fixtureId: candidate.id.startsWith('fixture-') ? candidate.id : null,
      providerMarketId: candidate.providerMarketId,
      sport: candidate.sport ?? null,
      candidate,
      rawProviderPayloadHash: candidate.rawProviderPayloadHash,
      createdAt: new Date(),
    }));
    await this.dataSource!.getRepository(CandidateSnapshotEntity).save(records);
  }

  async saveAcceptedTemplates(templates: CanonicalSportsTemplate[]): Promise<void> {
    for (const template of templates) {
      this.memoryAcceptedTemplates.set(template.templateHash.toLowerCase(), template);
    }
    if (!this.enabled) return;
    const records: SportsTemplateEntity[] = templates.map((template) => ({
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
    await this.dataSource!.getRepository(SportsTemplateEntity).upsert(
      records as QueryDeepPartialEntity<SportsTemplateEntity>[],
      ['templateHash'],
    );
  }

  async findAcceptedTemplate(templateHash: string): Promise<CanonicalSportsTemplate | undefined> {
    const normalized = templateHash.toLowerCase();
    const memoryTemplate = this.memoryAcceptedTemplates.get(normalized);
    if (memoryTemplate) return memoryTemplate;
    if (!this.enabled) return undefined;
    const record = await this.dataSource!.getRepository(SportsTemplateEntity)
      .createQueryBuilder('template')
      .where('lower(template.templateHash) = :templateHash', { templateHash: normalized })
      .getOne();
    return canonicalSportsTemplate(record?.template);
  }

  async findConditionResolutionStatuses(conditionIds: string[]): Promise<ConditionResolutionStatusEntity[]> {
    if (!this.enabled || conditionIds.length === 0) return [];
    const ids = [...new Set(conditionIds.map((id) => id.toLowerCase()))];
    return await this.dataSource!.getRepository(ConditionResolutionStatusEntity)
      .createQueryBuilder('status')
      .where('lower(status.conditionId) IN (:...conditionIds)', { conditionIds: ids })
      .getMany();
  }

  async saveConditionResolutionStatus(status: ConditionResolutionStatusEntity): Promise<void> {
    if (!this.enabled) return;
    await this.dataSource!.getRepository(ConditionResolutionStatusEntity).upsert(
      status as QueryDeepPartialEntity<ConditionResolutionStatusEntity>,
      ['conditionId'],
    );
  }

  async saveRejectedCandidates(rejected: RejectedCandidate[]): Promise<void> {
    if (!this.enabled) return;
    const records: RejectedCandidateEntity[] = rejected.map((item) => ({
      id: `rejected-${item.candidate.id}-${randomUUID()}`,
      candidateId: item.candidate.id,
      fixtureId: item.candidate.id.startsWith('fixture-') ? item.candidate.id : null,
      providerMarketId: item.candidate.providerMarketId,
      sport: item.candidate.sport ?? null,
      reasons: item.reasons,
      candidate: item.candidate,
      rejectedAt: new Date(),
    }));
    await this.dataSource!.getRepository(RejectedCandidateEntity).save(records);
  }

  async savePublishAudit(template: CanonicalSportsTemplate, payload: PublishableTemplatePayload): Promise<void> {
    if (!this.enabled) return;
    const record: TemplatePublishAuditEntity = {
      id: `publish-${template.templateId}-${randomUUID()}`,
      templateHash: template.templateHash,
      templateId: template.templateId,
      status: payload.status,
      publishedBy: payload.audit.publishedBy,
      payload,
      audit: payload.audit,
      createdAt: new Date(),
    };
    await this.dataSource!.getRepository(TemplatePublishAuditEntity).save(record);
  }
}

function canonicalSportsTemplate(value: unknown): CanonicalSportsTemplate | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const template = value as Partial<CanonicalSportsTemplate>;
  if (
    typeof template.templateHash !== 'string'
    || typeof template.conditionId !== 'string'
    || typeof template.questionId !== 'string'
  ) {
    return undefined;
  }
  return template as CanonicalSportsTemplate;
}
