import { DataSource } from 'typeorm';
import { loadAppConfig, type AppConfig } from '../config/env.js';
import {
  CandidateSnapshotEntity,
  DiscoveryRunEntity,
  RejectedCandidateEntity,
  SportsTemplateEntity,
  TemplatePublishAuditEntity,
} from '../modules/templates/persistence/entities/index.js';
import { CreateM1TemplateTables1716100000000 } from './migrations/1716100000000-CreateM1TemplateTables.js';

export function createDataSource(config: AppConfig = loadAppConfig()): DataSource {
  if (!config.database.enabled) {
    throw new Error('Database configuration is disabled; set DATABASE_URL or DB_HOST/DB_USERNAME/DB_DATABASE');
  }

  const common = {
    type: 'postgres' as const,
    synchronize: false,
    logging: false,
    entities: [
      DiscoveryRunEntity,
      CandidateSnapshotEntity,
      SportsTemplateEntity,
      RejectedCandidateEntity,
      TemplatePublishAuditEntity,
    ],
    migrations: [CreateM1TemplateTables1716100000000],
  };

  if (config.database.url) {
    return new DataSource({
      ...common,
      url: config.database.url,
    });
  }

  return new DataSource({
    ...common,
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
  });
}
