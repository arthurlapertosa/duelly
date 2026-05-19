import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { buildImport } from '../scripts/harness/lib/backlog-import.mjs';
import { applyPlan } from '../scripts/harness/sync-github-backlog.mjs';
import {
  milestoneDescription,
  planGithubBacklogSync,
  syncManagedLabel,
} from '../scripts/harness/lib/github-backlog-sync.mjs';

function githubMilestonesFromBacklog(backlog) {
  return backlog.milestones.map((milestone, index) => ({
    number: index + 1,
    title: milestone.title,
    description: milestoneDescription(milestone.sourcePath),
    state: 'open',
  }));
}

function milestoneNumberByTitle(milestones) {
  return new Map(milestones.map((milestone) => [milestone.title, milestone.number]));
}

function githubIssueFromBacklog(issue, number, milestoneNumber) {
  return {
    number,
    title: issue.title,
    body: issue.body,
    state: 'open',
    labels: issue.labels.map((name) => ({ name })),
    milestone: {
      number: milestoneNumber,
      title: issue.milestone,
    },
  };
}

test('sync planner creates missing M1.T00 and updates stale M1 metadata', () => {
  const backlog = buildImport();
  const milestones = githubMilestonesFromBacklog(backlog);
  const m1 = milestones.find((milestone) => milestone.title === 'M1 — Product Rules & Sports Template System');
  m1.title = 'M1 — Product Rules & Template System';

  const milestoneNumbers = milestoneNumberByTitle(milestones);
  const issues = backlog.issues
    .filter((issue) => issue.taskId !== 'M1.T00')
    .map((issue, index) => githubIssueFromBacklog(issue, index + 1, milestoneNumbers.get(issue.milestone)));
  const m1t01 = issues.find((issue) => issue.title.startsWith('[M1.T01]'));
  m1t01.title = '[M1.T01] Finalize template acceptance policy and initial category decision';
  m1t01.body = m1t01.body.replace('Finalize sports template acceptance policy and binary market rules', 'Finalize template acceptance policy and initial category decision');

  const plan = planGithubBacklogSync({
    backlog,
    github: {
      milestones,
      labels: backlog.labels,
      issues,
    },
  });

  assert.equal(plan.ok, true);
  assert.ok(plan.operations.milestones.some((operation) => (
    operation.action === 'updateMilestone'
    && operation.number === m1.number
    && operation.changes.title.to === 'M1 — Product Rules & Sports Template System'
  )));
  assert.ok(plan.operations.issues.some((operation) => (
    operation.action === 'createIssue'
    && operation.taskId === 'M1.T00'
  )));
  assert.ok(plan.operations.issues.some((operation) => (
    operation.action === 'updateIssue'
    && operation.taskId === 'M1.T01'
    && operation.changes.title
    && operation.changes.body
  )));
});

test('sync planner preserves issue state and human labels while replacing generated labels', () => {
  const milestone = {
    id: 'M0',
    title: 'M0 — Repository & Harness Foundation',
    sourcePath: 'milestones-0-repository-harness-foundation/milestone.md',
  };
  const backlog = {
    milestones: [milestone],
    labels: [
      { name: 'priority:P0', color: 'b60205', description: 'Critical milestone or task priority' },
      { name: 'priority:P1', color: 'd93f0b', description: 'High milestone or task priority' },
      { name: 'domain:harness', color: '5319e7', description: 'Repository harness, workflow, or governance work' },
      { name: syncManagedLabel, color: '0e8a16', description: 'Issue is managed by the backlog sync workflow' },
    ],
    issues: [{
      taskId: 'M0.T01',
      title: '[M0.T01] Current title',
      body: 'Source: `milestones-0-repository-harness-foundation/task-01.md`\n\nTask ID: M0.T01\nPriority: P0',
      labels: ['priority:P0', 'domain:harness', syncManagedLabel],
      milestone: milestone.title,
    }],
  };

  const plan = planGithubBacklogSync({
    backlog,
    github: {
      milestones: [{
        number: 1,
        title: milestone.title,
        description: milestoneDescription(milestone.sourcePath),
        state: 'closed',
      }],
      labels: backlog.labels,
      issues: [{
        number: 2,
        title: '[M0.T01] Old title',
        body: 'Source: `milestones-0-repository-harness-foundation/task-01.md`\n\nTask ID: M0.T01\nold body',
        state: 'closed',
        updated_at: '2026-05-19T00:00:00Z',
        labels: [
          { name: 'priority:P1' },
          { name: 'priority:blocked' },
          { name: 'domain:harness' },
          { name: 'human:keep' },
          { name: syncManagedLabel },
        ],
        milestone: { number: 1, title: milestone.title },
      }],
    },
  });

  const operation = plan.operations.issues.find((item) => item.taskId === 'M0.T01');
  assert.equal(plan.ok, true);
  assert.equal(operation.action, 'updateIssue');
  assert.equal('state' in operation, false);
  assert.deepEqual(operation.labels, ['domain:harness', 'human:keep', 'priority:blocked', 'priority:P0', syncManagedLabel]);
});

test('sync planner rejects duplicate GitHub task ids', () => {
  const backlog = {
    milestones: [{
      id: 'M1',
      title: 'M1 — Product Rules',
      sourcePath: 'milestones-1-product-rules-template-system/milestone.md',
    }],
    labels: [],
    issues: [{
      taskId: 'M1.T01',
      title: '[M1.T01] Task',
      body: 'Task ID: M1.T01',
      labels: [],
      milestone: 'M1 — Product Rules',
    }],
  };
  const github = {
    milestones: [{
      number: 1,
      title: 'M1 — Product Rules',
      description: milestoneDescription('milestones-1-product-rules-template-system/milestone.md'),
    }],
    labels: [],
    issues: [
      { number: 1, title: '[M1.T01] Task', body: 'Task ID: M1.T01', labels: [{ name: syncManagedLabel }], milestone: { number: 1 } },
      { number: 2, title: '[M1.T01] Duplicate', body: 'Task ID: M1.T01', labels: [{ name: syncManagedLabel }], milestone: { number: 1 } },
    ],
  };

  const plan = planGithubBacklogSync({ backlog, github });
  assert.equal(plan.ok, false);
  assert.ok(plan.errors.some((item) => item.code === 'DUPLICATE_GITHUB_TASK_ID'));
});

test('sync planner rejects orphan GitHub task ids', () => {
  const backlog = {
    milestones: [{
      id: 'M1',
      title: 'M1 — Product Rules',
      sourcePath: 'milestones-1-product-rules-template-system/milestone.md',
    }],
    labels: [],
    issues: [],
  };
  const github = {
    milestones: [{
      number: 1,
      title: 'M1 — Product Rules',
      description: milestoneDescription('milestones-1-product-rules-template-system/milestone.md'),
    }],
    labels: [],
    issues: [{ number: 7, title: '[M1.T99] Removed task', body: 'Task ID: M1.T99', labels: [{ name: syncManagedLabel }], milestone: { number: 1 } }],
  };

  const plan = planGithubBacklogSync({ backlog, github });
  assert.equal(plan.ok, false);
  assert.ok(plan.errors.some((item) => item.code === 'ORPHAN_GITHUB_ISSUE'));
});

test('sync planner ignores unmanaged issues with task-like text', () => {
  const backlog = {
    milestones: [{
      id: 'M1',
      title: 'M1 — Product Rules',
      sourcePath: 'milestones-1-product-rules-template-system/milestone.md',
    }],
    labels: [],
    issues: [{
      taskId: 'M1.T01',
      title: '[M1.T01] Task',
      body: 'Task ID: M1.T01',
      labels: [],
      milestone: 'M1 — Product Rules',
    }],
  };
  const github = {
    milestones: [{
      number: 1,
      title: 'M1 — Product Rules',
      description: milestoneDescription('milestones-1-product-rules-template-system/milestone.md'),
    }],
    labels: [],
    issues: [{
      number: 2,
      title: '[M1.T01] Forged task',
      body: 'Source: `milestones-1-product-rules-template-system/task-01.md`\n\nTask ID: M1.T01',
      labels: [{ name: 'priority:P0' }, { name: 'domain:harness' }],
      milestone: { number: 1 },
    }],
  };

  const plan = planGithubBacklogSync({ backlog, github });
  assert.equal(plan.ok, true);
  assert.ok(plan.warnings.some((item) => item.code === 'UNMANAGED_TASK_LIKE_ISSUE'));
  assert.ok(plan.operations.issues.some((item) => item.action === 'createIssue' && item.taskId === 'M1.T01'));
});

test('sync planner trusts repo-tracked issue map for legacy imported issues', () => {
  const backlog = {
    milestones: [{
      id: 'M1',
      title: 'M1 — Product Rules',
      sourcePath: 'milestones-1-product-rules-template-system/milestone.md',
    }],
    labels: [
      { name: syncManagedLabel, color: '0e8a16', description: 'Issue is managed by the backlog sync workflow' },
    ],
    issues: [{
      taskId: 'M1.T01',
      title: '[M1.T01] Updated task',
      body: 'Source: `milestones-1-product-rules-template-system/task-01.md`\n\nTask ID: M1.T01',
      labels: [syncManagedLabel],
      milestone: 'M1 — Product Rules',
    }],
  };
  const github = {
    milestones: [{
      number: 1,
      title: 'M1 — Product Rules',
      description: milestoneDescription('milestones-1-product-rules-template-system/milestone.md'),
    }],
    labels: [],
    issues: [{
      number: 7,
      title: '[M1.T01] Stale task',
      body: 'Task ID: M1.T01\nold body',
      labels: [{ name: 'priority:P0' }],
      milestone: { number: 1 },
      updated_at: '2026-05-19T00:00:00Z',
    }],
  };

  const plan = planGithubBacklogSync({
    backlog,
    github,
    githubIssueMap: { taskIssues: { 'M1.T01': 7 } },
  });

  const operation = plan.operations.issues.find((item) => item.taskId === 'M1.T01');
  assert.equal(plan.ok, true);
  assert.equal(operation.action, 'updateIssue');
  assert.equal(operation.number, 7);
});

test('sync planner rejects milestone title collisions without source mapping', () => {
  const backlog = {
    milestones: [{
      id: 'M1',
      title: 'M1 — Product Rules',
      sourcePath: 'milestones-1-product-rules-template-system/milestone.md',
    }],
    labels: [],
    issues: [],
  };
  const github = {
    milestones: [{
      number: 1,
      title: 'M1 — Product Rules',
      description: 'Created manually',
    }],
    labels: [],
    issues: [],
  };

  const plan = planGithubBacklogSync({ backlog, github });
  assert.equal(plan.ok, false);
  assert.ok(plan.errors.some((item) => item.code === 'MILESTONE_TITLE_COLLISION'));
});

test('sync CLI apply mode requires an explicit token', () => {
  assert.throws(
    () => execFileSync('node', [
      'scripts/harness/sync-github-backlog.mjs',
      '--repo',
      'arthurlapertosa/duelly',
      '--apply',
    ], {
      env: {
        ...process.env,
        GITHUB_TOKEN: '',
        GH_TOKEN: '',
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
    /--apply requires GITHUB_TOKEN or GH_TOKEN/,
  );
});

test('apply plan mutates labels, milestones, and issues through GitHub requests', async () => {
  const calls = [];
  const request = async (requestOptions) => {
    calls.push(requestOptions);
    if (requestOptions.path === '/repos/arthurlapertosa/duelly/milestones') {
      return { number: 10 };
    }
    if (requestOptions.path === '/repos/arthurlapertosa/duelly/milestones/2') {
      return { number: 2 };
    }
    if (requestOptions.path === '/repos/arthurlapertosa/duelly/issues') {
      return { number: 20 };
    }
    if (requestOptions.path === '/repos/arthurlapertosa/duelly/issues/7' && !requestOptions.method) {
      return {
        number: 7,
        updated_at: '2026-05-19T00:00:00Z',
        labels: [
          { name: 'human:keep' },
          { name: 'priority:P1' },
          { name: 'priority:blocked' },
        ],
      };
    }
    if (requestOptions.path === '/repos/arthurlapertosa/duelly/issues/7' && requestOptions.method === 'PATCH') {
      return { number: 7 };
    }
    return {};
  };

  const applied = await applyPlan({
    token: 'token',
    repo: 'arthurlapertosa/duelly',
    request,
    plan: {
      syncOwnedLabels: [syncManagedLabel, 'priority:P0', 'priority:P1'],
      operations: {
        labels: [
          { action: 'createLabel', name: syncManagedLabel, color: '0e8a16', description: 'Managed' },
          { action: 'updateLabel', name: 'priority:P0', color: 'b60205', description: 'P0' },
        ],
        milestones: [
          {
            action: 'createMilestone',
            title: 'M7 — New',
            description: milestoneDescription('milestones-7-new/milestone.md'),
            sourcePath: 'milestones-7-new/milestone.md',
          },
          {
            action: 'updateMilestone',
            number: 2,
            title: 'M1 — Product Rules & Sports Template System',
            description: milestoneDescription('milestones-1-product-rules-template-system/milestone.md'),
            sourcePath: 'milestones-1-product-rules-template-system/milestone.md',
          },
        ],
        issues: [
          {
            action: 'createIssue',
            taskId: 'M7.T01',
            title: '[M7.T01] New task',
            body: 'Task ID: M7.T01',
            labels: [syncManagedLabel, 'priority:P0'],
            milestoneSourcePath: 'milestones-7-new/milestone.md',
            milestoneTitle: 'M7 — New',
          },
          {
            action: 'updateIssue',
            number: 7,
            taskId: 'M1.T01',
            title: '[M1.T01] Updated task',
            body: 'Task ID: M1.T01',
            labels: [syncManagedLabel, 'priority:P0'],
            desiredLabels: [syncManagedLabel, 'priority:P0'],
            milestoneNumber: 2,
            milestoneSourcePath: 'milestones-1-product-rules-template-system/milestone.md',
            milestoneTitle: 'M1 — Product Rules & Sports Template System',
            expectedUpdatedAt: '2026-05-19T00:00:00Z',
          },
        ],
      },
    },
  });

  assert.deepEqual(applied.map((item) => item.action), [
    'createLabel',
    'updateLabel',
    'createMilestone',
    'updateMilestone',
    'createIssue',
    'updateIssue',
  ]);
  const updateIssueCall = calls.find((call) => call.path === '/repos/arthurlapertosa/duelly/issues/7' && call.method === 'PATCH');
  assert.deepEqual(updateIssueCall.body.labels, ['human:keep', 'priority:blocked', 'priority:P0', syncManagedLabel]);
});

test('apply plan refuses stale issue updates', async () => {
  await assert.rejects(
    () => applyPlan({
      token: 'token',
      repo: 'arthurlapertosa/duelly',
      request: async () => ({
        number: 7,
        updated_at: '2026-05-19T00:01:00Z',
        labels: [],
      }),
      plan: {
        syncOwnedLabels: [syncManagedLabel],
        operations: {
          labels: [],
          milestones: [],
          issues: [{
            action: 'updateIssue',
            number: 7,
            taskId: 'M1.T01',
            title: '[M1.T01] Updated task',
            body: 'Task ID: M1.T01',
            labels: [syncManagedLabel],
            desiredLabels: [syncManagedLabel],
            milestoneNumber: 2,
            milestoneTitle: 'M1 — Product Rules',
            expectedUpdatedAt: '2026-05-19T00:00:00Z',
          }],
        },
      },
    }),
    /changed after planning/,
  );
});
