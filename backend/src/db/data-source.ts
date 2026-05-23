import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadAppConfig, type AppConfig } from '../config/env.js';
import {
  CandidateSnapshotEntity,
  DiscoveryRunEntity,
  RejectedCandidateEntity,
  SportsTemplateEntity,
  TemplatePublishAuditEntity,
  orchestrationEntities,
} from '../modules/templates/persistence/entities/index.js';
import { CreateM1TemplateTables1716100000000 } from './migrations/1716100000000-CreateM1TemplateTables.js';
import { CreateOrchestrationTables1716200000000 } from './migrations/1716200000000-CreateOrchestrationTables.js';
import { AddInviteAuthorizations1716300000000 } from './migrations/1716300000000-AddInviteAuthorizations.js';
import { AddInviteRecipientEmail1716400000000 } from './migrations/1716400000000-AddInviteRecipientEmail.js';
import { CreateConditionResolutionStatuses1716500000000 } from './migrations/1716500000000-CreateConditionResolutionStatuses.js';
import { AddDeploymentScopedOrchestration1716600000000 } from './migrations/1716600000000-AddDeploymentScopedOrchestration.js';
import { AddRelayerAttemptLocks1716601000000 } from './migrations/1716601000000-AddRelayerAttemptLocks.js';
import { AddTemplateSnapshotIndexes1716700000000 } from './migrations/1716700000000-AddTemplateSnapshotIndexes.js';
import { CreateTemplateCtfSyncStatuses1716800000000 } from './migrations/1716800000000-CreateTemplateCtfSyncStatuses.js';

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
      ...orchestrationEntities,
    ],
    migrations: [
      CreateM1TemplateTables1716100000000,
      CreateOrchestrationTables1716200000000,
      AddInviteAuthorizations1716300000000,
      AddInviteRecipientEmail1716400000000,
      CreateConditionResolutionStatuses1716500000000,
      AddDeploymentScopedOrchestration1716600000000,
      AddRelayerAttemptLocks1716601000000,
      AddTemplateSnapshotIndexes1716700000000,
      CreateTemplateCtfSyncStatuses1716800000000,
    ],
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
