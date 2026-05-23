import test from 'node:test';
import assert from 'node:assert/strict';
import vectors from '../fixtures/template-hash-vectors.json' with { type: 'json' };
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';
import { hashCanonicalInputs } from '../../src/modules/templates/hashing/template-hash.service.js';

const fixtureNow = new Date('2026-05-19T00:00:00.000Z');

test('template hash vectors are deterministic', async () => {
  const candidates = await loadFixtureCandidates();
  const result = new TemplateFilterService().filter(candidates, { now: fixtureNow });
  const byId = new Map(result.accepted.map((template) => [template.templateId, template]));

  for (const vector of vectors) {
    assert.equal(byId.get(vector.templateId)?.templateHash, vector.expectedTemplateHash);
  }
});

test('critical template field changes alter hash while active does not alter identity', async () => {
  const [candidate] = await loadFixtureCandidates('football');
  const [template] = new TemplateFilterService().filter([candidate], { now: fixtureNow }).accepted;
  const { templateHash: _templateHash, ...withoutHash } = template;

  assert.equal(hashCanonicalInputs(withoutHash), template.templateHash);
  assert.notEqual(hashCanonicalInputs({ ...withoutHash, conditionId: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' }), template.templateHash);
  assert.notEqual(hashCanonicalInputs({ ...withoutHash, loserFeeBps: template.loserFeeBps + 1 }), template.templateHash);
  assert.equal(hashCanonicalInputs({ ...withoutHash, active: false }), template.templateHash);
  assert.equal(hashCanonicalInputs({
    ...withoutHash,
    resolvedBy: '0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7',
    ctfOracleAddress: '0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7',
    ctfOracleSource: 'gamma-resolved-by',
    ctfOracleValidationStatus: 'validated',
  }), template.templateHash);
});
