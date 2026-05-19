import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../config/env.js';
import { sports, type DiscoveryMode, type Sport } from '../modules/templates/domain/types.js';
import { DiscoveryAdapter } from '../modules/templates/discovery/discovery-adapter.js';
import { TemplateFilterService } from '../modules/templates/filtering/template-filter.service.js';
import { TemplateRepository } from '../modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../modules/templates/publisher/template-publisher.service.js';

interface TemplateRouteOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

interface TemplateQuery {
  mode?: DiscoveryMode;
  sport?: Sport;
}

interface PublishBody {
  templateId?: string;
  publishedBy?: string;
}

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');

export async function registerTemplateRoutes(app: FastifyInstance, options: TemplateRouteOptions): Promise<void> {
  const adapter = new DiscoveryAdapter(options.config);
  const filter = new TemplateFilterService();
  const repository = new TemplateRepository(options.dataSource);
  const publisher = new TemplatePublisherService();

  app.get<{ Querystring: TemplateQuery }>('/templates/candidates', async (request, reply) => {
    const query = parseTemplateQuery(request.query);
    const modeCheck = validateMode(query, options.config);
    if (modeCheck) return modeCheck(reply);
    const candidates = await adapter.discover(query);
    const discoveryRunId = await repository.recordDiscoveryRun({
      mode: query.mode ?? options.config.polymarket.discoveryMode,
      sport: query.sport ?? null,
      provider: 'polymarket',
      status: 'completed',
      gammaBaseUrl: query.mode === 'live' ? options.config.polymarket.gammaBaseUrl : null,
    });
    await repository.saveCandidates(candidates, discoveryRunId);
    return { mode: query.mode ?? options.config.polymarket.discoveryMode, count: candidates.length, candidates };
  });

  app.get<{ Querystring: TemplateQuery }>('/templates', async (request, reply) => {
    const query = parseTemplateQuery(request.query);
    const modeCheck = validateMode(query, options.config);
    if (modeCheck) return modeCheck(reply);
    const result = await discoverAndFilter(adapter, filter, repository, options.config, query);
    return { mode: query.mode ?? options.config.polymarket.discoveryMode, count: result.accepted.length, templates: result.accepted };
  });

  app.get<{ Querystring: TemplateQuery }>('/templates/rejected', async (request, reply) => {
    const query = parseTemplateQuery(request.query);
    const modeCheck = validateMode(query, options.config);
    if (modeCheck) return modeCheck(reply);
    const result = await discoverAndFilter(adapter, filter, repository, options.config, query);
    return { mode: query.mode ?? options.config.polymarket.discoveryMode, count: result.rejected.length, rejected: result.rejected };
  });

  app.post<{ Querystring: TemplateQuery; Body: PublishBody }>('/templates/publish', async (request, reply) => {
    const query = parseTemplateQuery(request.query);
    if ((query.mode ?? options.config.polymarket.discoveryMode) !== 'fixture') {
      reply.code(400);
      return { status: 'error', code: 'PUBLISH_LIVE_DISABLED' };
    }
    if (options.config.nodeEnv === 'production') {
      reply.code(403);
      return { status: 'error', code: 'PUBLISH_STUB_DISABLED' };
    }
    if (!repository.enabled) {
      reply.code(503);
      return { status: 'error', code: 'PUBLISH_AUDIT_DB_REQUIRED' };
    }

    const body = request.body ?? {};
    if (!body.templateId) {
      reply.code(400);
      return { status: 'error', code: 'MISSING_TEMPLATE_ID' };
    }

    const result = await discoverAndFilter(adapter, filter, repository, options.config, query);
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

    const payload = publisher.buildPublishablePayload(template, 'local-fixture-qa');
    await repository.savePublishAudit(template, payload);
    return payload;
  });
}

function validateMode(query: { mode?: DiscoveryMode }, config: AppConfig) {
  const mode = query.mode ?? config.polymarket.discoveryMode;
  if (mode === 'live' && !config.polymarket.liveDiscoveryEnabled) {
    return (reply: { code: (statusCode: number) => void }) => {
      reply.code(403);
      return { status: 'error', code: 'LIVE_DISCOVERY_DISABLED' };
    };
  }
  return undefined;
}

async function discoverAndFilter(
  adapter: DiscoveryAdapter,
  filter: TemplateFilterService,
  repository: TemplateRepository,
  config: AppConfig,
  query: { mode?: DiscoveryMode; sport?: Sport },
) {
  const mode = query.mode ?? config.polymarket.discoveryMode;
  const candidates = await adapter.discover(query);
  const result = filter.filter(candidates, { now: mode === 'fixture' ? fixtureNow : new Date() });
  await repository.saveCandidates(candidates);
  await repository.saveAcceptedTemplates(result.accepted);
  await repository.saveRejectedCandidates(result.rejected);
  return result;
}

function parseTemplateQuery(query: TemplateQuery): TemplateQuery {
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
