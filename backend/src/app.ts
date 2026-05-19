import Fastify, { type FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import { loadAppConfig, type AppConfig } from './config/env.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerTemplateRoutes } from './routes/template.routes.js';

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

  await registerHealthRoutes(app, { config, dataSource: options.dataSource });
  await registerTemplateRoutes(app, { config, dataSource: options.dataSource });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    dataSource?: DataSource;
  }
}
