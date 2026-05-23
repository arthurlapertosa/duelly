import { randomUUID } from 'node:crypto';
import { Brackets, type DataSource } from 'typeorm';
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

export interface CurrentTemplateListInput {
  mode: string;
  sport?: string;
  searchTerms: string[];
  limit: number;
  cursor?: TemplatePageCursor;
  staleAfterMs: number;
}

export interface CurrentTemplateListResult {
  templates: CanonicalSportsTemplate[];
  count: number;
  nextCursor: TemplatePageCursor | null;
  refreshedAt: Date | null;
  stale: boolean;
}

export interface TemplatePageCursor {
  eventStartAt: number;
  templateId: string;
}

export class TemplateRepository {
  private readonly memoryAcceptedTemplates = new Map<string, CanonicalSportsTemplate>();
  private readonly memoryAcceptedTemplatesById = new Map<string, CanonicalSportsTemplate>();

  constructor(private readonly dataSource?: DataSource) {}

  get enabled(): boolean {
    return Boolean(this.dataSource?.isInitialized);
  }

  async recordDiscoveryRun(input: Pick<DiscoveryRunEntity, 'mode' | 'sport' | 'provider' | 'status' | 'gammaBaseUrl'> & {
    id?: string;
    startedAt?: Date;
    finishedAt?: Date;
    error?: string | null;
  }): Promise<string | undefined> {
    if (!this.enabled) return undefined;
    const id = input.id ?? `discovery-${randomUUID()}`;
    await this.dataSource!.getRepository(DiscoveryRunEntity).save({
      ...input,
      id,
      startedAt: input.startedAt ?? new Date(),
      finishedAt: input.finishedAt ?? new Date(),
      error: input.error ?? null,
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

  async saveAcceptedTemplates(templates: CanonicalSportsTemplate[], discoveryRunId?: string): Promise<void> {
    const now = new Date();
    for (const template of templates) {
      this.memoryAcceptedTemplates.set(template.templateHash.toLowerCase(), template);
      this.memoryAcceptedTemplatesById.set(template.templateId, template);
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
      acceptedAt: now,
      eventStartAt: String(template.eventStartAt),
      bettingCloseAt: String(template.bettingCloseAt),
      resolutionDeadline: String(template.resolutionDeadline),
      searchText: templateSearchText(template),
      lastSeenAt: now,
      lastDiscoveryRunId: discoveryRunId ?? null,
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

  async findAcceptedTemplateByIdOrHash(id: string): Promise<CanonicalSportsTemplate | undefined> {
    const normalized = id.toLowerCase();
    const memoryById = this.memoryAcceptedTemplatesById.get(id);
    if (memoryById) return memoryById;
    const memoryByHash = this.memoryAcceptedTemplates.get(normalized);
    if (memoryByHash) return memoryByHash;
    if (!this.enabled) return undefined;
    const record = await this.dataSource!.getRepository(SportsTemplateEntity)
      .createQueryBuilder('template')
      .where('template.templateId = :id', { id })
      .orWhere('lower(template.templateHash) = :hash', { hash: normalized })
      .orderBy('template.lastSeenAt', 'DESC')
      .getOne();
    return canonicalSportsTemplate(record?.template);
  }

  async findCurrentAcceptedTemplateByIdOrHash(id: string, mode: string): Promise<CanonicalSportsTemplate | undefined> {
    const run = await this.findLatestSuccessfulDiscoveryRun(mode);
    if (!run) return undefined;
    return await this.findCurrentAcceptedTemplateForRun(id, run.id);
  }

  async findLatestSuccessfulDiscoveryRun(mode: string): Promise<DiscoveryRunEntity | undefined> {
    if (!this.enabled) return undefined;
    return await this.dataSource!.getRepository(DiscoveryRunEntity)
      .createQueryBuilder('run')
      .where('run.mode = :mode', { mode })
      .andWhere('run.provider = :provider', { provider: 'polymarket' })
      .andWhere('run.status = :status', { status: 'succeeded' })
      .orderBy('run.finishedAt', 'DESC')
      .addOrderBy('run.id', 'DESC')
      .getOne() ?? undefined;
  }

  async listCurrentAcceptedTemplates(input: CurrentTemplateListInput): Promise<CurrentTemplateListResult> {
    if (!this.enabled) {
      return { templates: [], count: 0, nextCursor: null, refreshedAt: null, stale: false };
    }
    const run = await this.findLatestSuccessfulDiscoveryRun(input.mode);
    if (!run) {
      return { templates: [], count: 0, nextCursor: null, refreshedAt: null, stale: false };
    }

    const base = this.currentTemplateQuery(run.id, input.sport, input.searchTerms);
    const count = await base.clone().getCount();
    const page = base.clone()
      .orderBy('template.eventStartAt', 'ASC')
      .addOrderBy('template.templateId', 'ASC')
      .take(input.limit + 1);
    if (input.cursor) {
      page.andWhere(new Brackets((cursor) => {
        cursor
          .where('template.eventStartAt > :cursorEventStartAt', { cursorEventStartAt: String(input.cursor!.eventStartAt) })
          .orWhere('template.eventStartAt = :cursorEventStartAt and template.templateId > :cursorTemplateId', {
            cursorEventStartAt: String(input.cursor!.eventStartAt),
            cursorTemplateId: input.cursor!.templateId,
          });
      }));
    }

    const records = await page.getMany();
    const hasMore = records.length > input.limit;
    const visible = hasMore ? records.slice(0, input.limit) : records;
    const last = visible.at(-1);
    return {
      templates: visible.map((record) => canonicalSportsTemplate(record.template)).filter(isTemplate),
      count,
      nextCursor: hasMore && last ? {
        eventStartAt: Number(last.eventStartAt),
        templateId: last.templateId,
      } : null,
      refreshedAt: run.finishedAt ?? null,
      stale: run.finishedAt ? Date.now() - run.finishedAt.getTime() > input.staleAfterMs : true,
    };
  }

  private async findCurrentAcceptedTemplateForRun(id: string, discoveryRunId: string): Promise<CanonicalSportsTemplate | undefined> {
    const normalized = id.toLowerCase();
    const record = await this.currentTemplateQuery(discoveryRunId, undefined, [])
      .andWhere(new Brackets((candidate) => {
        candidate
          .where('template.templateId = :id', { id })
          .orWhere('lower(template.templateHash) = :hash', { hash: normalized });
      }))
      .getOne();
    return canonicalSportsTemplate(record?.template);
  }

  private currentTemplateQuery(discoveryRunId: string, sport: string | undefined, searchTerms: string[]) {
    const query = this.dataSource!.getRepository(SportsTemplateEntity)
      .createQueryBuilder('template')
      .leftJoin(ConditionResolutionStatusEntity, 'resolution', 'lower(resolution.conditionId) = lower(template.conditionId)')
      .where('template.lastDiscoveryRunId = :discoveryRunId', { discoveryRunId })
      .andWhere('template.active = true')
      .andWhere('(resolution.status is null or resolution.status <> :resolved)', { resolved: 'resolved' });
    if (sport) query.andWhere('template.sport = :sport', { sport });
    searchTerms.forEach((term, index) => {
      query.andWhere(`template.searchText like :searchTerm${index} escape '\\'`, {
        [`searchTerm${index}`]: `%${escapeLike(term)}%`,
      });
    });
    return query;
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

function isTemplate(value: CanonicalSportsTemplate | undefined): value is CanonicalSportsTemplate {
  return Boolean(value);
}

export function templateSearchText(template: CanonicalSportsTemplate): string {
  return normalizeSearchText([
    template.display.question,
    template.display.ptBR?.question,
    template.display.ptBR?.rulesSummary,
    ...(template.display.ptBR?.outcomes ?? []),
    template.sport,
    template.provider,
    'Polymarket',
    template.outcomeA.label,
    template.outcomeB.label,
  ].filter(Boolean).join(' '));
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
