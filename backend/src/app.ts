import 'reflect-metadata';
import Fastify, { type FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import { loadAppConfig, type AppConfig } from './config/env.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerOrchestrationRoutes } from './routes/orchestration.routes.js';
import { registerTemplateRoutes } from './routes/template.routes.js';
import { ResolutionWorker } from './modules/orchestration/services.js';

export interface CreateAppOptions {
  config?: AppConfig;
  dataSource?: DataSource;
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadAppConfig();
  const app = Fastify({
    logger: config.nodeEnv === 'test' ? false : {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  app.decorate('config', config);
  if (options.dataSource) app.decorate('dataSource', options.dataSource);
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && config.cors.origins.includes(origin)) {
      reply.header('access-control-allow-origin', origin);
      reply.header('vary', 'Origin');
      reply.header('access-control-allow-credentials', 'true');
      reply.header('access-control-allow-headers', 'authorization,content-type');
      reply.header('access-control-allow-methods', 'DELETE,GET,POST,OPTIONS');
    }
    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });

  await registerHealthRoutes(app, { config, dataSource: options.dataSource });
  await registerTemplateRoutes(app, { config, dataSource: options.dataSource });
  const orchestration = await registerOrchestrationRoutes(app, { config, dataSource: options.dataSource });
  const resolutionWorker = new ResolutionWorker(
    config,
    orchestration.repository,
    orchestration.chain,
    orchestration.indexer,
    orchestration.resolution,
    orchestration.resolutionMirror,
    app.log,
  );
  resolutionWorker.start();
  app.addHook('onClose', async () => {
    resolutionWorker.stop();
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    dataSource?: DataSource;
  }
}
