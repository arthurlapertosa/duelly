import { lstatSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const DEFAULT_STATUS_PATH = 'backlog/status.json';

const statusAliases = new Map([
  ['planned', 'todo'],
  ['todo', 'todo'],
  ['to do', 'todo'],
  ['backlog', 'todo'],
  ['in progress', 'in_progress'],
  ['active', 'in_progress'],
  ['doing', 'in_progress'],
  ['blocked', 'blocked'],
  ['review', 'review'],
  ['in review', 'review'],
  ['done', 'done'],
  ['complete', 'done'],
  ['completed', 'done'],
]);

const defaultProgressByStatus = {
  todo: 0,
  in_progress: 50,
  blocked: 0,
  review: 90,
  done: 100,
};

function firstMatch(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${sep}`));
}

function assertBacklogMarkdownFile(backlogRoot, path, sourcePath) {
  const stat = lstatSync(path);
  if (!stat.isFile()) {
    throw new Error(`${sourcePath} must be a regular markdown file`);
  }
  if (!isInside(realpathSync(backlogRoot), realpathSync(path))) {
    throw new Error(`${sourcePath} resolves outside backlog`);
  }
}

function readBacklogMarkdown(backlogRoot, dir, file) {
  const sourcePath = markdownPath(dir, file);
  const path = join(backlogRoot, dir, file);
  assertBacklogMarkdownFile(backlogRoot, path, sourcePath);
  return readFileSync(path, 'utf8');
}

function section(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return firstMatch(content, new RegExp(`^## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n$)`, 'm'));
}

function compactText(value) {
  return value
    .replace(/\s+/g, ' ')
    .trim();
}

function firstParagraph(content, heading) {
  const value = section(content, heading);
  if (!value) return '';

  return compactText(value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('- ') && !block.startsWith('|')) || '');
}

function firstTopLevelBullet(content, heading) {
  const value = section(content, heading);
  if (!value) return '';

  for (const line of value.split(/\r?\n/)) {
    const match = line.match(/^- (.+)$/);
    if (match) return compactText(match[1]);
  }

  return '';
}

function markdownField(content, field) {
  return firstMatch(content, new RegExp(`^\\*\\*${field}:\\*\\*\\s+(.+?)\\s*$`, 'm'))
    .replace(/\s+$/g, '')
    .trim();
}

function normalizeStatus(rawStatus, sourcePath) {
  const normalized = statusAliases.get(rawStatus.trim().toLowerCase());
  if (!normalized) {
    throw new Error(`${sourcePath} has unsupported Status value: ${rawStatus || '(missing)'}`);
  }
  return normalized;
}

function parseProgress(content, status, sourcePath) {
  const rawProgress = markdownField(content, 'Progress');
  if (!rawProgress) return defaultProgressByStatus[status];

  const numeric = Number(rawProgress.replace(/%$/, ''));
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
    throw new Error(`${sourcePath} has invalid Progress value: ${rawProgress}`);
  }
  return numeric;
}

function markdownPath(dir, file) {
  return `./${dir}/${file}`;
}

function resolveStatusPath(root, statusPath) {
  const destination = isAbsolute(statusPath) ? resolve(statusPath) : resolve(root, statusPath);
  const canonical = resolve(root, DEFAULT_STATUS_PATH);
  if (destination !== canonical) {
    throw new Error(`status path must be ${DEFAULT_STATUS_PATH}`);
  }
  return destination;
}

function machineMilestoneId(publicId) {
  const match = publicId.match(/^M(\d+)$/);
  if (!match) throw new Error(`Invalid milestone id: ${publicId}`);
  return `milestone_${match[1].padStart(3, '0')}`;
}

function machineTaskId(publicId) {
  const match = publicId.match(/^M(\d+)\.T(\d+)$/);
  if (!match) throw new Error(`Invalid task id: ${publicId}`);
  return `m${Number(match[1])}_t${match[2]}`;
}

function renderTitle(publicId, title) {
  return `${publicId} - ${title}`;
}

function readMilestone(backlogRoot, dir) {
  const file = 'milestone.md';
  const sourcePath = markdownPath(dir, file);
  const content = readBacklogMarkdown(backlogRoot, dir, file);
  const heading = firstMatch(content, /^#\s+(.+)$/m);
  const match = heading.match(/^(M\d+)\s+—\s+(.+)$/);
  if (!match) throw new Error(`${sourcePath} has invalid milestone heading`);

  const publicId = match[1];
  const title = match[2].trim();
  return {
    id: machineMilestoneId(publicId),
    title: renderTitle(publicId, title),
    description: firstParagraph(content, 'Goal') || title,
    status: 'todo',
    progress: 0,
    markdown: sourcePath,
    tasks: [],
  };
}

function readTask(backlogRoot, dir, file, milestoneId) {
  const sourcePath = markdownPath(dir, file);
  const content = readBacklogMarkdown(backlogRoot, dir, file);
  const heading = firstMatch(content, /^#\s+(.+)$/m);
  const match = heading.match(/^(M\d+\.T\d+)\s+—\s+(.+)$/);
  if (!match) throw new Error(`${sourcePath} has invalid task heading`);

  const publicId = match[1];
  const title = match[2].trim();
  const status = normalizeStatus(markdownField(content, 'Status'), sourcePath);
  const progress = parseProgress(content, status, sourcePath);
  return {
    id: machineTaskId(publicId),
    milestone: milestoneId,
    title: renderTitle(publicId, title),
    description: firstTopLevelBullet(content, 'Scope') || title,
    status,
    progress,
    markdown: sourcePath,
  };
}

function summarizeMilestone(taskItems) {
  if (taskItems.length === 0) return { status: 'todo', progress: 0 };

  const progress = Math.round(taskItems.reduce((sum, task) => sum + task.progress, 0) / taskItems.length);
  if (taskItems.every((task) => task.status === 'done')) return { status: 'done', progress: 100 };
  if (taskItems.some((task) => task.status === 'blocked')) return { status: 'blocked', progress };
  if (taskItems.some((task) => task.status === 'in_progress')) return { status: 'in_progress', progress };
  if (taskItems.some((task) => task.status === 'review')) return { status: 'review', progress };
  return { status: 'todo', progress };
}

export function buildBacklogStatus(root = process.cwd()) {
  const backlogRoot = join(root, 'backlog');
  const milestoneDirs = readdirSync(backlogRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('milestones-'))
    .map((entry) => entry.name)
    .sort();

  const milestones = {};
  const tasks = {};

  for (const dir of milestoneDirs) {
    const milestone = readMilestone(backlogRoot, dir);
    const taskFiles = readdirSync(join(backlogRoot, dir), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^task-\d+-.+\.md$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    const milestoneTasks = [];

    for (const file of taskFiles) {
      const task = readTask(backlogRoot, dir, file, milestone.id);
      milestone.tasks.push(task.id);
      tasks[task.id] = task;
      milestoneTasks.push(task);
    }

    const summary = summarizeMilestone(milestoneTasks);
    milestone.status = summary.status;
    milestone.progress = summary.progress;
    milestones[milestone.id] = milestone;
  }

  return {
    version: 1,
    milestones,
    tasks,
  };
}

export function renderBacklogStatus(status) {
  return `${JSON.stringify(status, null, 2)}\n`;
}

export function writeBacklogStatus(root = process.cwd(), statusPath = DEFAULT_STATUS_PATH) {
  const destination = resolveStatusPath(root, statusPath);
  const status = buildBacklogStatus(root);
  writeFileSync(destination, renderBacklogStatus(status));
  return {
    status,
    path: destination,
  };
}

export function checkBacklogStatusDrift(root = process.cwd(), statusPath = DEFAULT_STATUS_PATH) {
  const destination = resolveStatusPath(root, statusPath);
  const expected = renderBacklogStatus(buildBacklogStatus(root));
  const relativePath = relative(root, destination).split(sep).join('/');
  let actual = '';
  try {
    actual = readFileSync(destination, 'utf8');
  } catch {
    actual = '';
  }

  return {
    ok: actual === expected,
    file: relativePath,
    reason: actual ? actual === expected ? 'current' : 'content differs' : 'missing',
  };
}
