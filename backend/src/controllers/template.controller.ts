import type { FastifyReply, FastifyRequest } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../config/env.js';
import { sports, type DiscoveryMode, type Sport } from '../modules/templates/domain/types.js';
import { DiscoveryAdapter } from '../modules/templates/discovery/discovery-adapter.js';
import { TemplateFilterService } from '../modules/templates/filtering/template-filter.service.js';
import { TemplateRepository } from '../modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../modules/templates/publisher/template-publisher.service.js';

export interface TemplateControllerOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

export interface TemplateQuery {
  mode?: DiscoveryMode;
  sport?: Sport;
}

export interface PublishBody {
  templateId?: string;
  publishedBy?: string;
}

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');

export class TemplateController {
  private readonly adapter: DiscoveryAdapter;
  private readonly filter = new TemplateFilterService();
  private readonly repository: TemplateRepository;
  private readonly publisher = new TemplatePublisherService();

  constructor(private readonly options: TemplateControllerOptions) {
    this.adapter = new DiscoveryAdapter(options.config);
    this.repository = new TemplateRepository(options.dataSource);
  }

  listCandidates = async (
    request: FastifyRequest<{ Querystring: TemplateQuery }>,
    reply: FastifyReply,
  ) => {
    const query = this.parseTemplateQuery(request.query);
    const modeCheck = this.validateMode(query);
    if (modeCheck) return modeCheck(reply);

    const mode = this.resolveMode(query);
    const candidates = await this.adapter.discover(query);
    const discoveryRunId = await this.repository.recordDiscoveryRun({
      mode,
      sport: query.sport ?? null,
      provider: 'polymarket',
      status: 'completed',
      gammaBaseUrl: mode === 'live' ? this.options.config.polymarket.gammaBaseUrl : null,
    });
    await this.repository.saveCandidates(candidates, discoveryRunId);
    return { mode, count: candidates.length, candidates };
  };

  listAcceptedTemplates = async (
    request: FastifyRequest<{ Querystring: TemplateQuery }>,
    reply: FastifyReply,
  ) => {
    const query = this.parseTemplateQuery(request.query);
    const modeCheck = this.validateMode(query);
    if (modeCheck) return modeCheck(reply);

    const result = await this.discoverAndFilter(query);
    return { mode: this.resolveMode(query), count: result.accepted.length, templates: result.accepted };
  };

  listRejectedCandidates = async (
    request: FastifyRequest<{ Querystring: TemplateQuery }>,
    reply: FastifyReply,
  ) => {
    const query = this.parseTemplateQuery(request.query);
    const modeCheck = this.validateMode(query);
    if (modeCheck) return modeCheck(reply);

    const result = await this.discoverAndFilter(query);
    return { mode: this.resolveMode(query), count: result.rejected.length, rejected: result.rejected };
  };

  publishTemplate = async (
    request: FastifyRequest<{ Querystring: TemplateQuery; Body: PublishBody }>,
    reply: FastifyReply,
  ) => {
    const query = this.parseTemplateQuery(request.query);
    if (this.resolveMode(query) !== 'fixture') {
      reply.code(400);
      return { status: 'error', code: 'PUBLISH_LIVE_DISABLED' };
    }
    if (this.options.config.nodeEnv === 'production') {
      reply.code(403);
      return { status: 'error', code: 'PUBLISH_STUB_DISABLED' };
    }
    if (!this.repository.enabled) {
      reply.code(503);
      return { status: 'error', code: 'PUBLISH_AUDIT_DB_REQUIRED' };
    }

    const body = request.body ?? {};
    if (!body.templateId) {
      reply.code(400);
      return { status: 'error', code: 'MISSING_TEMPLATE_ID' };
    }

    const result = await this.discoverAndFilter(query);
    const template = result.accepted.find((item) => item.templateId === body.templateId || item.templateHash === body.templateId);
    if (!template) {
      const rejected = result.rejected.find((item) => item.candidate.id === body.templateId);
      reply.code(400);
      return {
        status: 'error',
        code: 'TEMPLATE_NOT_PUBLISHABLE',
        reasons: rejected?.reasons ?? ['TEMPLATE_NOT_ACCEPTED'],
      };
    }

    const payload = this.publisher.buildPublishablePayload(template, 'local-fixture-qa');
    await this.repository.savePublishAudit(template, payload);
    return payload;
  };

  private validateMode(query: { mode?: DiscoveryMode }) {
    const mode = this.resolveMode(query);
    if (mode === 'live' && !this.options.config.polymarket.liveDiscoveryEnabled) {
      return (reply: { code: (statusCode: number) => void }) => {
        reply.code(403);
        return { status: 'error', code: 'LIVE_DISCOVERY_DISABLED' };
      };
    }
    return undefined;
  }

  private async discoverAndFilter(query: { mode?: DiscoveryMode; sport?: Sport }) {
    const mode = this.resolveMode(query);
    const candidates = await this.adapter.discover(query);
    const result = this.filter.filter(candidates, { now: mode === 'fixture' ? fixtureNow : new Date() });
    await this.repository.saveCandidates(candidates);
    await this.repository.saveAcceptedTemplates(result.accepted);
    await this.repository.saveRejectedCandidates(result.rejected);
    return result;
  }

  private parseTemplateQuery(query: TemplateQuery): TemplateQuery {
    const mode = query.mode;
    if (mode && mode !== 'fixture' && mode !== 'live') {
      throw new Error('mode must be fixture or live');
    }

    const sport = query.sport;
    if (sport && !(sports as readonly string[]).includes(sport)) {
      throw new Error('sport must be one of football, tennis, ufc, f1');
    }

    return { mode, sport };
  }

  private resolveMode(query: { mode?: DiscoveryMode }): DiscoveryMode {
    return query.mode ?? this.options.config.polymarket.discoveryMode;
  }
}
