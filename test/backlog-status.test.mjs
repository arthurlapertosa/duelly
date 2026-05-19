import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { parseStatusJson, validateBacklogStatus } from '../scripts/harness/validate-backlog-status.mjs';
import { createBacklogServer } from '../backlog/server.mjs';

test('backlog status manifest maps all current milestones and tasks', () => {
  const summary = validateBacklogStatus();
  assert.deepEqual(summary, {
    ok: true,
    milestones: 7,
    tasks: 55,
    markdownFiles: 62,
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
