import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectionReasonCodes } from '../../src/modules/templates/domain/rejection-reasons.js';
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');

test('fixture filter accepts only approved M1 sports templates', async () => {
  const candidates = await loadFixtureCandidates();
  const result = new TemplateFilterService().filter(candidates, { now: fixtureNow });

  assert.equal(result.accepted.length, 8);
  assert.deepEqual(new Set(result.accepted.map((template) => template.sport)), new Set(['football', 'tennis', 'ufc', 'f1']));
  assert.equal(result.accepted.every((template) => template.templateHash.startsWith('0x')), true);
});

test('fixture rejection matrix covers every required M1 reason code', async () => {
  const candidates = await loadFixtureCandidates();
  const result = new TemplateFilterService().filter(candidates, { now: fixtureNow });
  const covered = new Set(result.rejected.flatMap((item) => item.reasons));

  for (const reason of rejectionReasonCodes) {
    assert.equal(covered.has(reason), true, `${reason} should be covered by fixtures`);
  }
});
