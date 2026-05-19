import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../../src/config/env.js';
import { createDataSource } from '../../src/db/data-source.js';
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';
import {
  CandidateSnapshotEntity,
  RejectedCandidateEntity,
  SportsTemplateEntity,
  TemplatePublishAuditEntity,
} from '../../src/modules/templates/persistence/entities/index.js';
import { TemplateRepository } from '../../src/modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../../src/modules/templates/publisher/template-publisher.service.js';

const hasDb = Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_DATABASE));

test('TypeORM repositories persist M1 template records in PostgreSQL', { skip: !hasDb }, async () => {
  const config = loadAppConfig();
  const dataSource = createDataSource(config);
  await dataSource.initialize();
  test.after(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  await dataSource.runMigrations();

  const repository = new TemplateRepository(dataSource);
  const candidates = await loadFixtureCandidates('f1');
  const result = new TemplateFilterService().filter(candidates, { now: new Date('2026-05-19T00:00:00.000Z') });
  const payload = new TemplatePublisherService().buildPublishablePayload(result.accepted[0], 'integration-test');

  await repository.saveCandidates(candidates);
  await repository.saveAcceptedTemplates(result.accepted);
  await repository.saveRejectedCandidates(result.rejected);
  await repository.savePublishAudit(result.accepted[0], payload);

  assert.ok(await dataSource.getRepository(CandidateSnapshotEntity).count() >= candidates.length);
  assert.ok(await dataSource.getRepository(SportsTemplateEntity).count() >= result.accepted.length);
  assert.ok(await dataSource.getRepository(RejectedCandidateEntity).count() >= result.rejected.length);
  assert.ok(await dataSource.getRepository(TemplatePublishAuditEntity).count() >= 1);
});
