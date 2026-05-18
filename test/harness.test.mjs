import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' });
}

test('harness validator passes', () => {
  const output = run('node', ['scripts/harness/validate-harness.mjs']);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
});

test('PR body renderer includes mandatory sections', () => {
  const output = run('node', ['scripts/harness/render-pr-body.mjs', '--self-test']);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
});

test('PR template contains HITL guardrail', () => {
  const template = readFileSync('.github/pull_request_template.md', 'utf8');
  assert.match(template, /HITL/);
  assert.match(template, /Human QA approved/);
});
