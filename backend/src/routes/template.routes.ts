import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../config/env.js';
import {
  AcceptedTemplatesController,
  CandidateTemplatesController,
  PublishTemplateController,
  RejectedCandidatesController,
  TemplateCtfSyncController,
  TemplateControllerContext,
  type PublishBody,
  type TemplateQuery,
} from '../controllers/templates/index.js';
import { internalAuthPreHandler } from './internal-auth.js';

interface TemplateRouteOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

export async function registerTemplateRoutes(
  app: FastifyInstance,
  options: TemplateRouteOptions,
): Promise<TemplateControllerContext> {
  const context = new TemplateControllerContext({ ...options, logger: app.log });
  const candidates = new CandidateTemplatesController(context);
  const accepted = new AcceptedTemplatesController(context);
  const rejected = new RejectedCandidatesController(context);
  const publisher = new PublishTemplateController(context);
  const ctfSync = new TemplateCtfSyncController(context);
  const internal = { preHandler: internalAuthPreHandler(options.config) };

  app.get<{ Querystring: TemplateQuery }>('/templates/candidates', candidates.list);
  app.get<{ Querystring: TemplateQuery }>('/templates', accepted.list);
  app.get<{ Querystring: TemplateQuery }>('/templates/rejected', rejected.list);
  app.post<{ Querystring: TemplateQuery; Body: PublishBody }>('/templates/publish', publisher.publish);
  app.post('/internal/templates/ctf-sync/run', internal, ctfSync.run);

  return context;
}
