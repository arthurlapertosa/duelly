import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';
import { TemplatePublisherService } from '../../src/modules/templates/publisher/template-publisher.service.js';

test('publisher builds compact on-chain payload from accepted templates', async () => {
  const candidates = await loadFixtureCandidates('ufc');
  const [template] = new TemplateFilterService()
    .filter(candidates, { now: new Date('2026-05-19T00:00:00.000Z') })
    .accepted;

  const payload = new TemplatePublisherService().buildPublishablePayload(template, 'test-runner');

  assert.equal(payload.status, 'publishable');
  assert.equal(payload.audit.publishedBy, 'test-runner');
  assert.equal(payload.onChain.args.templateHash, template.templateHash);
  assert.equal(payload.onChain.args.active, true);
  assert.equal(payload.onChain.calldata, null);
});
