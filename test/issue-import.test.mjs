import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' });
}

function taskFileCount() {
  return readdirSync('backlog', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('milestones-'))
    .flatMap((entry) => readdirSync(join('backlog', entry.name)).filter((file) => /^task-\d+-.+\.md$/.test(file)))
    .length;
}

test('issue import dry run preserves backlog task metadata', () => {
  const dir = mkdtempSync(join(tmpdir(), 'duelly-issue-import-'));
  const output = run('node', [
    'scripts/harness/generate-issue-import.mjs',
    '--dry-run',
    '--output-dir',
    dir,
  ]);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);

  const issues = JSON.parse(readFileSync(join(dir, 'issues.json'), 'utf8'));
  assert.equal(issues.length, taskFileCount());

  const task = issues.find((issue) => issue.taskId === 'M0.T02');
  assert.ok(task, 'M0.T02 should be present');
  assert.equal(task.priority, 'P0');
  assert.equal(task.sourcePath, 'milestones-0-repository-harness-foundation/task-02-configure-github-repository-safety-controls.md');
  assert.equal(task.milestone, 'M0 — Repository & Harness Foundation');
  assert.match(task.dependenciesText, /M0\.T01/);

  const m1t00 = issues.find((issue) => issue.taskId === 'M1.T00');
  assert.ok(m1t00, 'M1.T00 should be present');
  assert.equal(m1t00.title, '[M1.T00] Establish backend framework foundation for M1');
  assert.equal(m1t00.milestone, 'M1 — Product Rules & Sports Template System');

  const m35t01 = issues.find((issue) => issue.taskId === 'M3.5.T01');
  assert.ok(m35t01, 'M3.5.T01 should be present');
  assert.equal(m35t01.title, '[M3.5.T01] Define Inter PJ + OKX PJ architecture, provider policy, and compliance gate');
  assert.equal(m35t01.milestone, 'M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations');
});

test('issue import dry run emits required labels and milestone names', () => {
  const dir = mkdtempSync(join(tmpdir(), 'duelly-issue-import-'));
  run('node', [
    'scripts/harness/generate-issue-import.mjs',
    '--dry-run',
    '--output-dir',
    dir,
  ]);

  const labels = JSON.parse(readFileSync(join(dir, 'labels.json'), 'utf8')).map((label) => label.name);
  for (const label of [
    'priority:P0',
    'priority:P1',
    'priority:P2',
    'domain:frontend',
    'domain:backend',
    'domain:smartcontract',
    'domain:harness',
    'sync:backlog',
    'qa:playwright',
    'qa:curl',
    'qa:foundry',
    'qa:e2e',
  ]) {
    assert.ok(labels.includes(label), `${label} should be proposed`);
  }

  const milestones = JSON.parse(readFileSync(join(dir, 'milestones.json'), 'utf8')).map((milestone) => milestone.title);
  assert.ok(milestones.includes('M0 — Repository & Harness Foundation'));
  assert.ok(milestones.includes('M1 — Product Rules & Sports Template System'));
  assert.ok(milestones.includes('M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations'));
  assert.ok(milestones.includes('M6 — Launch Readiness & Controlled Pilot, Wallet-First Flow'));
});

test('issue import committed metadata check detects no drift', () => {
  const output = run('node', [
    'scripts/harness/generate-issue-import.mjs',
    '--check',
  ]);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.issues, taskFileCount());
});
