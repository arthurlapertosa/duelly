import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../config/env.js';

interface HealthRouteOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

export async function registerHealthRoutes(app: FastifyInstance, options: HealthRouteOptions): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: options.config.serviceName,
    uptimeSeconds: Math.floor(process.uptime()),
  }));

  app.get('/ready', async (request, reply) => {
    if (!options.config.database.enabled && options.config.nodeEnv === 'test') {
      return {
        status: 'ok',
        service: options.config.serviceName,
        database: 'disabled',
      };
    }

    if (!options.config.database.enabled) {
      reply.code(503);
      return {
        status: 'error',
        service: options.config.serviceName,
        database: 'required',
      };
    }

    if (!options.dataSource?.isInitialized) {
      reply.code(503);
      return {
        status: 'error',
        service: options.config.serviceName,
        database: 'not_initialized',
      };
    }

    try {
      await options.dataSource.query('select 1');
      return {
        status: 'ok',
        service: options.config.serviceName,
        database: 'connected',
      };
    } catch {
      reply.code(503);
      return {
        status: 'error',
        service: options.config.serviceName,
        database: 'unreachable',
      };
    }
  });
}
