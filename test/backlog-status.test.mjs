import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseStatusJson, validateBacklogStatus } from '../scripts/harness/validate-backlog-status.mjs';
import { buildBacklogStatus, checkBacklogStatusDrift, writeBacklogStatus } from '../scripts/harness/lib/backlog-status.mjs';
import { createBacklogServer } from '../backlog/server.mjs';

test('backlog status manifest maps all current milestones and tasks', () => {
  const summary = validateBacklogStatus();
  assert.deepEqual(summary, {
    ok: true,
    milestones: 8,
    tasks: 65,
    markdownFiles: 73,
  });
});

test('backlog status relationships and markdown paths are valid', () => {
  const manifest = parseStatusJson(readFileSync('backlog/status.json', 'utf8'));
  const milestones = manifest.milestones || {};
  const tasks = manifest.tasks || {};

  for (const [milestoneId, milestone] of Object.entries(milestones)) {
    assert.equal(milestone.id, milestoneId);
    assert.equal(existsSync(join('backlog', milestone.markdown)), true, milestone.markdown);
    for (const taskId of milestone.tasks) {
      assert.equal(tasks[taskId].milestone, milestoneId);
    }
  }

  for (const [taskId, task] of Object.entries(tasks)) {
    assert.equal(task.id, taskId);
    assert.equal(existsSync(join('backlog', task.markdown)), true, task.markdown);
    assert.equal(milestones[task.milestone].tasks.includes(taskId), true);
  }
});

test('backlog status manifest is generated from markdown', () => {
  const committed = parseStatusJson(readFileSync('backlog/status.json', 'utf8'));
  const generated = buildBacklogStatus();
  assert.deepEqual(generated, committed);
  assert.deepEqual(checkBacklogStatusDrift(), {
    ok: true,
    file: 'backlog/status.json',
    reason: 'current',
  });
  assert.equal(generated.tasks.m0_t01.status, 'done');
  assert.equal(generated.tasks.m0_t01.progress, 100);
  assert.equal(generated.tasks.m1_t00.status, 'todo');
});

test('backlog status generator supports dotted milestone ids', () => {
  const root = mkdtempSync(join(tmpdir(), 'duelly-backlog-status-generator-'));
  try {
    mkdirSync(join(root, 'backlog', 'milestones-3-demo'), { recursive: true });
    writeFileSync(join(root, 'backlog', 'milestones-3-demo', 'milestone.md'), [
      '# M3 — Demo',
      '',
      '## Goal',
      '',
      'Demo milestone.',
      '',
    ].join('\n'), 'utf8');
    writeFileSync(join(root, 'backlog', 'milestones-3-demo', 'task-01-demo.md'), [
      '# M3.T01 — Demo task',
      '',
      '**Milestone:** M3 — Demo  ',
      '**Priority:** P0  ',
      '**Type:** Harness  ',
      '**Status:** Planned',
      '',
      '## Scope',
      '',
      '- Demonstrate integer milestone support.',
      '',
    ].join('\n'), 'utf8');

    mkdirSync(join(root, 'backlog', 'milestones-3-5-demo'), { recursive: true });
    writeFileSync(join(root, 'backlog', 'milestones-3-5-demo', 'milestone.md'), [
      '# M3.5 — Dotted Demo',
      '',
      '## Goal',
      '',
      'Dotted demo milestone.',
      '',
    ].join('\n'), 'utf8');
    writeFileSync(join(root, 'backlog', 'milestones-3-5-demo', 'task-01-dotted-demo.md'), [
      '# M3.5.T01 — Dotted task',
      '',
      '**Milestone:** M3.5 — Dotted Demo  ',
      '**Priority:** P0  ',
      '**Type:** Harness  ',
      '**Status:** Planned',
      '',
      '## Scope',
      '',
      '- Demonstrate dotted milestone support.',
      '',
    ].join('\n'), 'utf8');

    const generated = buildBacklogStatus(root);
    assert.deepEqual(Object.keys(generated.milestones), ['milestone_003', 'milestone_003_005']);
    assert.equal(generated.milestones.milestone_003_005.tasks[0], 'm3_5_t01');
    assert.equal(generated.tasks.m3_5_t01.title, 'M3.5.T01 - Dotted task');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('backlog status generator rejects unsupported markdown status values', () => {
  const root = mkdtempSync(join(tmpdir(), 'duelly-backlog-status-generator-'));
  try {
    mkdirSync(join(root, 'backlog', 'milestones-0-demo'), { recursive: true });
    writeFileSync(join(root, 'backlog', 'milestones-0-demo', 'milestone.md'), [
      '# M0 — Demo',
      '',
      '## Goal',
      '',
      'Demo milestone.',
      '',
    ].join('\n'), 'utf8');
    writeFileSync(join(root, 'backlog', 'milestones-0-demo', 'task-01-demo.md'), [
      '# M0.T01 — Demo task',
      '',
      '**Milestone:** M0 — Demo  ',
      '**Priority:** P0  ',
      '**Type:** Harness  ',
      '**Status:** Waiting',
      '',
      '## Scope',
      '',
      '- Demonstrate status validation.',
      '',
    ].join('\n'), 'utf8');

    assert.throws(
      () => buildBacklogStatus(root),
      /unsupported Status value: Waiting/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('backlog status generator rejects duplicate task ids', () => {
  const root = mkdtempSync(join(tmpdir(), 'duelly-backlog-status-generator-'));
  try {
    mkdirSync(join(root, 'backlog', 'milestones-0-demo'), { recursive: true });
    writeFileSync(join(root, 'backlog', 'milestones-0-demo', 'milestone.md'), [
      '# M0 — Demo',
      '',
      '## Goal',
      '',
      'Demo milestone.',
      '',
    ].join('\n'), 'utf8');
    for (const file of ['task-01-demo.md', 'task-02-duplicate-demo.md']) {
      writeFileSync(join(root, 'backlog', 'milestones-0-demo', file), [
        '# M0.T01 — Demo task',
        '',
        '**Milestone:** M0 — Demo  ',
        '**Priority:** P0  ',
        '**Type:** Harness  ',
        '**Status:** Planned',
        '',
        '## Scope',
        '',
        '- Demonstrate duplicate task validation.',
        '',
      ].join('\n'), 'utf8');
    }

    assert.throws(
      () => buildBacklogStatus(root),
      /duplicates task id m0_t01/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('backlog status generator only writes the canonical status path', () => {
  assert.throws(
    () => writeBacklogStatus(process.cwd(), '../status.json'),
    /status path must be backlog\/status\.json/,
  );
});

test('backlog status validator rejects invalid status values', () => {
  const root = mkdtempSync(join(tmpdir(), 'duelly-backlog-status-'));
  try {
    mkdirSync(join(root, 'backlog', 'milestones-demo', 'tasks'), { recursive: true });
    writeFileSync(join(root, 'backlog', 'milestones-demo', 'milestone.md'), '# Demo\n', 'utf8');
    writeFileSync(join(root, 'backlog', 'milestones-demo', 'tasks', 'task-01.md'), '# Task\n', 'utf8');
    writeFileSync(join(root, 'backlog', 'status.json'), JSON.stringify({
      version: 1,
      milestones: {
        milestone_000: {
          id: 'milestone_000',
          title: 'Demo',
          description: 'Demo',
          status: 'todo',
          progress: 0,
          markdown: './milestones-demo/milestone.md',
          tasks: ['m0_t01'],
        },
      },
      tasks: {
        m0_t01: {
          id: 'm0_t01',
          milestone: 'milestone_000',
          title: 'Task',
          description: 'Task',
          status: 'waiting',
          progress: 0,
          markdown: './milestones-demo/tasks/task-01.md',
        },
      },
    }), 'utf8');

    assert.throws(
      () => validateBacklogStatus({ root }),
      /tasks\.m0_t01 has invalid status: waiting/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('backlog server serves the status page and mapped markdown', async (t) => {
  const server = createBacklogServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const page = await fetch(`${baseUrl}/index.html`);
  assert.equal(page.status, 200);
  const pageHtml = await page.text();
  assert.match(pageHtml, /grid-template-columns: 440px minmax\(0, 1fr\)/);
  assert.match(pageHtml, /data-collapse-id=/);
  assert.match(pageHtml, /new Set\(milestones\.map\(\(milestone\) => milestone\.id\)\)/);
  assert.match(pageHtml, /linear-gradient\(90deg, #9ca3af 0%, #f97316 50%, #047857 100%\)/);
  assert.match(pageHtml, /function renderMarkdown\(markdown, selectedItem\)/);
  assert.match(pageHtml, /normalizeTitle\(heading\[2\]\) === normalizeTitle\(selectedItem\.title\)/);
  assert.doesNotMatch(pageHtml, /A server-rendered status view/);
  assert.doesNotMatch(pageHtml, /id="summary-milestones"/);

  const jsonMatch = pageHtml.match(/<script type="application\/json" id="status-data">([\s\S]*?)<\/script>/);
  assert.notEqual(jsonMatch, null);
  assert.equal(JSON.parse(jsonMatch[1]).version, 1);

  const markdown = await fetch(`${baseUrl}/markdown?path=${encodeURIComponent('./milestones-0-repository-harness-foundation/milestone.md')}`);
  assert.equal(markdown.status, 200);
  assert.match((await markdown.json()).markdown, /Repository & Harness Foundation/);

  const blocked = await fetch(`${baseUrl}/markdown?path=${encodeURIComponent('../README.md')}`);
  assert.equal(blocked.status, 404);
});
