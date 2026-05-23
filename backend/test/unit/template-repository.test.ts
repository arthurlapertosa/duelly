import test from 'node:test';
import assert from 'node:assert/strict';
import { TemplateRepository } from '../../src/modules/templates/persistence/template-repository.js';
import type { CanonicalSportsTemplate } from '../../src/modules/templates/domain/types.js';
import type { DataSource } from 'typeorm';

const conditionId = `0x${'ab'.repeat(32)}`;

test('template repository stores template CTF sync statuses by condition id', async () => {
  const repository = new TemplateRepository();
  const now = new Date('2026-05-23T00:00:00.000Z');

  await repository.saveTemplateCtfSyncStatus({
    conditionId,
    templateHash: `0x${'01'.repeat(32)}`,
    templateId: 'template-1',
    status: 'prepared',
    sourceDenominator: '0',
    forkDenominator: '0',
    prepareTransactionHash: `0x${'02'.repeat(32)}`,
    mirrorTransactionHash: null,
    blockNumber: '10',
    error: null,
    checkedAt: now,
    updatedAt: now,
  });

  const stored = await repository.findTemplateCtfSyncStatuses([conditionId.toUpperCase()]);

  assert.equal(stored.length, 1);
  assert.equal(stored[0].status, 'prepared');
  assert.equal(stored[0].prepareTransactionHash, `0x${'02'.repeat(32)}`);
});

test('template repository finds in-memory templates for CTF sync by template or condition', async () => {
  const repository = new TemplateRepository();
  await repository.saveAcceptedTemplates([template({ templateId: 'template-1', conditionId })]);
  await repository.saveAcceptedTemplates([template({ templateId: 'template-2', conditionId: `0x${'cd'.repeat(32)}` })]);

  assert.deepEqual(
    (await repository.findTemplatesForCtfSync({ mode: 'live', templateId: 'template-1', limit: 10 })).map((item) => item.templateId),
    ['template-1'],
  );
  assert.deepEqual(
    (await repository.findTemplatesForCtfSync({ mode: 'live', conditionId, limit: 10 })).map((item) => item.templateId),
    ['template-1'],
  );
});

test('template repository exact CTF sync lookup bypasses latest discovery run in SQL path', async () => {
  const repositoryNames: string[] = [];
  const whereCalls: Array<{ condition: unknown; params?: unknown }> = [];
  const andWhereCalls: Array<{ condition: unknown; params?: unknown }> = [];
  let takeLimit: number | undefined;
  const storedTemplate = template({ templateId: 'historical-template', conditionId });
  const queryBuilder = {
    leftJoin: () => queryBuilder,
    addSelect: () => queryBuilder,
    orderBy: () => queryBuilder,
    addOrderBy: () => queryBuilder,
    take: (limit: number) => {
      takeLimit = limit;
      return queryBuilder;
    },
    where: (condition: unknown, params?: unknown) => {
      whereCalls.push({ condition, params });
      return queryBuilder;
    },
    andWhere: (condition: unknown, params?: unknown) => {
      andWhereCalls.push({ condition, params });
      return queryBuilder;
    },
    getMany: async () => [{ template: storedTemplate }],
  };
  const dataSource = {
    isInitialized: true,
    getRepository: (entity: { name?: string }) => {
      repositoryNames.push(entity.name ?? 'unknown');
      assert.notEqual(entity.name, 'DiscoveryRunEntity', 'exact lookup should not query latest discovery run');
      return { createQueryBuilder: () => queryBuilder };
    },
  } as unknown as DataSource;
  const repository = new TemplateRepository(dataSource);

  const result = await repository.findTemplatesForCtfSync({
    mode: 'live',
    conditionId,
    limit: 3,
  });

  assert.deepEqual(result.map((item) => item.templateId), ['historical-template']);
  assert.equal(takeLimit, 3);
  assert.deepEqual(repositoryNames, ['SportsTemplateEntity']);
  assert.equal(whereCalls[0].condition, '1 = 1');
  assert.equal(andWhereCalls[0].condition, 'lower(template.conditionId) = :conditionId');
  assert.deepEqual(andWhereCalls[0].params, { conditionId });
});

function template(overrides: Partial<CanonicalSportsTemplate>): CanonicalSportsTemplate {
  return {
    templateId: 'template',
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId: `0x${'02'.repeat(32)}`,
    questionId: `0x${'03'.repeat(32)}`,
    display: { question: 'Will it happen?', ptBR: { question: 'Vai acontecer?', rulesSummary: '', outcomes: [] }, slug: 'test', rawProviderPayloadHash: 'hash' },
    ...overrides,
  } as CanonicalSportsTemplate;
}
