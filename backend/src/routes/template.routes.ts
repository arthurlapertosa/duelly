import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../config/env.js';
import { TemplateController, type PublishBody, type TemplateQuery } from '../controllers/template.controller.js';

interface TemplateRouteOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

export async function registerTemplateRoutes(app: FastifyInstance, options: TemplateRouteOptions): Promise<void> {
  const controller = new TemplateController(options);

  app.get<{ Querystring: TemplateQuery }>('/templates/candidates', controller.listCandidates);
  app.get<{ Querystring: TemplateQuery }>('/templates', controller.listAcceptedTemplates);
  app.get<{ Querystring: TemplateQuery }>('/templates/rejected', controller.listRejectedCandidates);
  app.post<{ Querystring: TemplateQuery; Body: PublishBody }>('/templates/publish', controller.publishTemplate);
}
