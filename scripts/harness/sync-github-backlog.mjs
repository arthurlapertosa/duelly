#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildImport } from './lib/backlog-import.mjs';
import { planGithubBacklogSync } from './lib/github-backlog-sync.mjs';

function usage() {
  console.log(`Usage:
  node scripts/harness/sync-github-backlog.mjs [--repo owner/name] [--dry-run]
  node scripts/harness/sync-github-backlog.mjs --repo owner/name --apply

Default mode is --dry-run. Apply mode requires GITHUB_TOKEN or GH_TOKEN.
`);
}

export function parseArgs(argv) {
  const args = { repo: null, apply: false, dryRun: true };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--apply') {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.apply = false;
      args.dryRun = true;
    } else if (arg === '--repo') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --repo');
      args.repo = value;
      i++;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function tokenFromGhCli() {
  try {
    return execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function resolveToken({ apply }) {
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (apply) {
    if (!envToken) {
      throw new Error('--apply requires GITHUB_TOKEN or GH_TOKEN');
    }
    return envToken;
  }
  const token = envToken || tokenFromGhCli();
  if (!token) {
    throw new Error('--dry-run requires GITHUB_TOKEN, GH_TOKEN, or an authenticated gh CLI session to read GitHub state');
  }
  return token;
}

function repoParts(repo) {
  const [owner, name, extra] = String(repo || '').split('/');
  if (!owner || !name || extra) throw new Error(`Invalid --repo value: ${repo}`);
  return { owner, name };
}

function readGithubIssueMap(root = process.cwd()) {
  const path = resolve(root, 'backlog/github-issue-import/github-map.json');
  if (!existsSync(path)) {
    return { version: 1, taskIssues: {} };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function githubRequest({ token, method = 'GET', path, body }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.message ? `: ${payload.message}` : '';
    throw new Error(`${method} ${path} failed with ${response.status}${message}`);
  }
  return payload;
}

export async function githubGetPaginated({ token, path }) {
  const results = [];
  for (let page = 1; page <= 100; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const payload = await githubRequest({
      token,
      path: `${path}${separator}per_page=100&page=${page}`,
    });
    if (!Array.isArray(payload)) {
      throw new Error(`Expected array response from GitHub: ${path}`);
    }
    results.push(...payload);
    if (payload.length < 100) break;
  }
  return results;
}

export async function fetchGithubState({ token, repo }) {
  const { owner, name } = repoParts(repo);
  const prefix = `/repos/${owner}/${name}`;
  const [milestones, labels, issues] = await Promise.all([
    githubGetPaginated({ token, path: `${prefix}/milestones?state=all` }),
    githubGetPaginated({ token, path: `${prefix}/labels` }),
    githubGetPaginated({ token, path: `${prefix}/issues?state=all` }),
  ]);

  return {
    milestones,
    labels,
    issues: issues.filter((issue) => !issue.pull_request),
  };
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function labelName(label) {
  return typeof label === 'string' ? label : label.name;
}

async function assertIssueFresh({ request, token, prefix, operation }) {
  if (!operation.expectedUpdatedAt) return null;
  const latest = await request({
    token,
    path: `${prefix}/issues/${operation.number}`,
  });
  if (latest.updated_at !== operation.expectedUpdatedAt) {
    throw new Error(`Issue #${operation.number} changed after planning; rerun sync before applying`);
  }
  return latest;
}

function labelsForLatestIssue({ latestIssue, operation, syncOwnedLabels }) {
  const current = sortedUnique((latestIssue.labels || []).map(labelName));
  const humanLabels = current.filter((name) => !syncOwnedLabels.has(name));
  return sortedUnique([...humanLabels, ...(operation.desiredLabels || operation.labels || [])]);
}

export async function applyPlan({ token, repo, plan, request = githubRequest }) {
  const { owner, name } = repoParts(repo);
  const prefix = `/repos/${owner}/${name}`;
  const applied = [];
  const milestoneNumberBySource = new Map();
  const syncOwnedLabels = new Set(plan.syncOwnedLabels || []);

  for (const op of plan.operations.issues.filter((item) => item.action === 'updateIssue')) {
    await assertIssueFresh({ request, token, prefix, operation: op });
  }

  for (const op of plan.operations.labels) {
    if (op.action === 'createLabel') {
      await request({
        token,
        method: 'POST',
        path: `${prefix}/labels`,
        body: { name: op.name, color: op.color, description: op.description },
      });
    } else if (op.action === 'updateLabel') {
      await request({
        token,
        method: 'PATCH',
        path: `${prefix}/labels/${encodeURIComponent(op.name)}`,
        body: { new_name: op.name, color: op.color, description: op.description },
      });
    }
    applied.push({ action: op.action, name: op.name });
  }

  for (const op of plan.operations.milestones) {
    let milestone;
    if (op.action === 'createMilestone') {
      milestone = await request({
        token,
        method: 'POST',
        path: `${prefix}/milestones`,
        body: { title: op.title, description: op.description },
      });
    } else if (op.action === 'updateMilestone') {
      milestone = await request({
        token,
        method: 'PATCH',
        path: `${prefix}/milestones/${op.number}`,
        body: { title: op.title, description: op.description },
      });
    }
    if (milestone?.number) milestoneNumberBySource.set(op.sourcePath, milestone.number);
    applied.push({ action: op.action, sourcePath: op.sourcePath, number: milestone?.number || op.number });
  }

  for (const op of plan.operations.issues) {
    const milestone = op.milestoneNumber || milestoneNumberBySource.get(op.milestoneSourcePath);
    if (!milestone) {
      throw new Error(`Cannot apply ${op.action} for ${op.taskId}; milestone number is unknown for ${op.milestoneTitle}`);
    }
    if (op.action === 'createIssue') {
      const issue = await request({
        token,
        method: 'POST',
        path: `${prefix}/issues`,
        body: {
          title: op.title,
          body: op.body,
          labels: op.labels,
          milestone,
        },
      });
      applied.push({ action: op.action, taskId: op.taskId, number: issue.number });
    } else if (op.action === 'updateIssue') {
      const latestIssue = await assertIssueFresh({ request, token, prefix, operation: op });
      const freshIssue = latestIssue || await request({
        token,
        path: `${prefix}/issues/${op.number}`,
      });
      await request({
        token,
        method: 'PATCH',
        path: `${prefix}/issues/${op.number}`,
        body: {
          title: op.title,
          body: op.body,
          labels: labelsForLatestIssue({ latestIssue: freshIssue, operation: op, syncOwnedLabels }),
          milestone,
        },
      });
      applied.push({ action: op.action, taskId: op.taskId, number: op.number });
    }
  }

  return applied;
}

export async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();

  const backlog = buildImport(process.cwd(), args.repo ? { repository: args.repo } : undefined);
  const repo = args.repo || backlog.repository;
  const githubIssueMap = readGithubIssueMap();
  const token = resolveToken({ apply: args.apply });
  const github = await fetchGithubState({ token, repo });
  const plan = planGithubBacklogSync({ backlog, github, githubIssueMap });

  if (!plan.ok) {
    console.log(JSON.stringify({
      ok: false,
      apply: args.apply,
      repo,
      ...plan,
    }, null, 2));
    process.exit(1);
  }

  if (!args.apply) {
    console.log(JSON.stringify({
      ok: true,
      apply: false,
      repo,
      ...plan,
    }, null, 2));
    return;
  }

  const applied = await applyPlan({ token, repo, plan });
  console.log(JSON.stringify({
    ok: true,
    apply: true,
    repo,
    summary: plan.summary,
    applied,
  }, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main().catch((error) => {
    console.error(`[sync-github-backlog] ${error.message}`);
    process.exit(1);
  });
}
