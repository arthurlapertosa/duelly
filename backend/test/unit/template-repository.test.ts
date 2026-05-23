import test from 'node:test';
import assert from 'node:assert/strict';
import { TemplateRepository } from '../../src/modules/templates/persistence/template-repository.js';
import type { CanonicalSportsTemplate } from '../../src/modules/templates/domain/types.js';

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
