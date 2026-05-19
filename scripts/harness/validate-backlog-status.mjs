#!/usr/bin/env node
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBacklogStatusDrift } from './lib/backlog-status.mjs';

const allowedStatuses = new Set(['todo', 'in_progress', 'blocked', 'review', 'done']);

export function parseStatusJson(content) {
  const parsed = JSON.parse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('status.json must contain a JSON object');
  }
  return parsed;
}

function fail(errors) {
  throw new Error(errors.join('\n'));
}

function collectMarkdownFiles(dir, root = dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, root, files);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const rel = relative(root, fullPath).split(sep).join('/');
    if (/^milestones-[^/]+\/milestone\.md$/.test(rel) || /^milestones-[^/]+\/task-[^/]+\.md$/.test(rel)) {
      files.push(`./${rel}`);
    }
  }
  return files.sort();
}

function resolveBacklogPath(backlogDir, manifestPath) {
  return resolve(backlogDir, manifestPath);
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${sep}`));
}

function validateRegularFileInside(errors, backlogDir, kind, tableKey, markdownPath, resolved) {
  if (!existsSync(resolved)) {
    errors.push(`${kind}.${tableKey} markdown does not exist: ${markdownPath}`);
    return;
  }

  let stat;
  try {
    stat = lstatSync(resolved);
  } catch {
    errors.push(`${kind}.${tableKey} markdown cannot be inspected: ${markdownPath}`);
    return;
  }

  if (!stat.isFile()) {
    errors.push(`${kind}.${tableKey} markdown must be a regular file: ${markdownPath}`);
    return;
  }

  if (!isInside(realpathSync(backlogDir), realpathSync(resolved))) {
    errors.push(`${kind}.${tableKey} markdown resolves outside backlog: ${markdownPath}`);
  }
}

function validateCommonItem(errors, backlogDir, kind, tableKey, item) {
  for (const key of ['id', 'title', 'description', 'status', 'markdown']) {
    if (typeof item[key] !== 'string' || item[key].trim() === '') {
      errors.push(`${kind}.${tableKey} missing string field: ${key}`);
    }
  }

  if (item.id !== tableKey) {
    errors.push(`${kind}.${tableKey} id field must match table key`);
  }

  if (!allowedStatuses.has(item.status)) {
    errors.push(`${kind}.${tableKey} has invalid status: ${item.status}`);
  }

  if (!Number.isInteger(item.progress) || item.progress < 0 || item.progress > 100) {
    errors.push(`${kind}.${tableKey} progress must be an integer from 0 to 100`);
  }

  if (typeof item.markdown === 'string') {
    const resolved = resolveBacklogPath(backlogDir, item.markdown);
    if (!isInside(backlogDir, resolved)) {
      errors.push(`${kind}.${tableKey} markdown path escapes backlog: ${item.markdown}`);
    } else {
      validateRegularFileInside(errors, backlogDir, kind, tableKey, item.markdown, resolved);
    }
  }
}

export function validateBacklogStatus({ root = process.cwd() } = {}) {
  const errors = [];
  const backlogDir = join(root, 'backlog');
  const statusPath = join(backlogDir, 'status.json');

  if (!existsSync(statusPath)) fail(['Missing backlog/status.json']);

  const manifest = parseStatusJson(readFileSync(statusPath, 'utf8'));
  const milestones = manifest.milestones || {};
  const tasks = manifest.tasks || {};

  if (manifest.version !== 1) errors.push('status.json version must be 1');
  if (!Object.keys(milestones).length) errors.push('status.json must define at least one milestone');
  if (!Object.keys(tasks).length) errors.push('status.json must define at least one task');

  for (const [id, milestone] of Object.entries(milestones)) {
    validateCommonItem(errors, backlogDir, 'milestones', id, milestone);
    if (!Array.isArray(milestone.tasks)) {
      errors.push(`milestones.${id} tasks must be an array`);
      continue;
    }
    for (const taskId of milestone.tasks) {
      if (typeof taskId !== 'string') {
        errors.push(`milestones.${id} contains a non-string task id`);
      } else if (!tasks[taskId]) {
        errors.push(`milestones.${id} references missing task: ${taskId}`);
      }
    }
  }

  for (const [id, task] of Object.entries(tasks)) {
    validateCommonItem(errors, backlogDir, 'tasks', id, task);
    if (typeof task.milestone !== 'string' || !milestones[task.milestone]) {
      errors.push(`tasks.${id} references missing milestone: ${task.milestone}`);
      continue;
    }
    const parentTaskIds = milestones[task.milestone].tasks || [];
    if (!parentTaskIds.includes(id)) {
      errors.push(`tasks.${id} is not listed in parent milestone ${task.milestone}`);
    }
  }

  const mappedMarkdown = new Set([
    ...Object.values(milestones).map((item) => item.markdown),
    ...Object.values(tasks).map((item) => item.markdown),
  ]);
  const discoveredMarkdown = collectMarkdownFiles(backlogDir);

  for (const markdown of discoveredMarkdown) {
    if (!mappedMarkdown.has(markdown)) {
      errors.push(`Discovered markdown is not mapped in status.json: ${markdown}`);
    }
  }

  if (errors.length) fail(errors);

  return {
    ok: true,
    milestones: Object.keys(milestones).length,
    tasks: Object.keys(tasks).length,
    markdownFiles: discoveredMarkdown.length,
  };
}

function main() {
  const result = validateBacklogStatus();
  const generated = checkBacklogStatusDrift();
  if (!generated.ok) {
    throw new Error(`Generated backlog status is stale: ${generated.file} (${generated.reason})`);
  }
  console.log(JSON.stringify({
    ...result,
    generated: generated.reason,
  }, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-backlog-status] ${error.message}`);
    process.exit(1);
  }
}
