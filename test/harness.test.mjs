import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

test('PR body renderer can link evidence paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'duelly-pr-body-'));
  const outputPath = join(dir, 'body.md');
  run('node', [
    'scripts/harness/render-pr-body.mjs',
    '--task',
    'M0.T04',
    '--summary',
    'document evidence conventions',
    '--qa',
    'npm run qa',
    '--evidence',
    'evidence/M0-T04',
    '--output',
    outputPath,
  ]);

  const body = readFileSync(outputPath, 'utf8');
  assert.match(body, /Evidence paths/);
  assert.match(body, /evidence\/M0-T04/);
});

test('PR template contains HITL guardrail', () => {
  const template = readFileSync('.github/pull_request_template.md', 'utf8');
  assert.match(template, /HITL/);
  assert.match(template, /Human QA approved/);
});
