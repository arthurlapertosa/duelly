import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

export const DEFAULT_REPOSITORY = 'arthurlapertosa/duelly';
export const DEFAULT_OUTPUT_DIR = 'backlog/github-issue-import';
export const syncManagedLabel = 'sync:backlog';

export const labelCatalog = [
  { name: 'priority:P0', color: 'b60205', description: 'Critical milestone or task priority' },
  { name: 'priority:P1', color: 'd93f0b', description: 'High milestone or task priority' },
  { name: 'priority:P2', color: 'fbca04', description: 'Normal milestone or task priority' },
  { name: 'domain:frontend', color: '1d76db', description: 'Frontend application work' },
  { name: 'domain:backend', color: '0e8a16', description: 'Backend service work' },
  { name: 'domain:smartcontract', color: '5319e7', description: 'Smart-contract and blockchain work' },
  { name: 'domain:harness', color: '5319e7', description: 'Repository harness, workflow, or governance work' },
  { name: 'domain:product', color: 'bfd4f2', description: 'Product rules, templates, or policy work' },
  { name: 'domain:e2e', color: '006b75', description: 'End-to-end integration work' },
  { name: 'domain:security', color: 'ee0701', description: 'Security, privacy, or compliance work' },
  { name: syncManagedLabel, color: '0e8a16', description: 'Issue is managed by the backlog sync workflow' },
  { name: 'qa:playwright', color: '0052cc', description: 'Requires Playwright evidence' },
  { name: 'qa:curl', color: '008672', description: 'Requires curl/API evidence' },
  { name: 'qa:foundry', color: '5319e7', description: 'Requires Foundry or smart-contract evidence' },
  { name: 'qa:e2e', color: '006b75', description: 'Requires end-to-end evidence' },
];

function firstMatch(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${sep}`));
}

function readBacklogMarkdown(root, dir, file) {
  const sourcePath = `${dir}/${file}`;
  const path = join(root, dir, file);
  const stat = lstatSync(path);
  if (!stat.isFile()) throw new Error(`${sourcePath} must be a regular markdown file`);
  if (!isInside(realpathSync(root), realpathSync(path))) {
    throw new Error(`${sourcePath} resolves outside backlog`);
  }
  return readFileSync(path, 'utf8');
}

function section(content, heading) {
  const pattern = new RegExp(`^## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n$)`, 'm');
  return firstMatch(content, pattern);
}

function bulletsFromSection(content, heading) {
  const value = section(content, heading);
  if (!value || value === '- None') return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);
}

function inferDomain(type, sourcePath, title) {
  const value = `${type} ${sourcePath} ${title}`.toLowerCase();
  if (value.includes('frontend') || value.includes('playwright') || value.includes('design')) return 'domain:frontend';
  if (value.includes('backend') || value.includes('api') || value.includes('curl')) return 'domain:backend';
  if (value.includes('smart contract') || value.includes('smartcontract') || value.includes('foundry') || value.includes('blockchain')) return 'domain:smartcontract';
  if (value.includes('end-to-end') || value.includes('e2e') || value.includes('integration')) return 'domain:e2e';
  if (value.includes('security') || value.includes('compliance')) return 'domain:security';
  if (value.includes('template') || value.includes('rules') || value.includes('product')) return 'domain:product';
  return 'domain:harness';
}

function inferQaLabels(content) {
  const value = content.toLowerCase();
  const labels = new Set();
  if (value.includes('playwright')) labels.add('qa:playwright');
  if (value.includes('curl') || value.includes('api validation')) labels.add('qa:curl');
  if (value.includes('forge') || value.includes('foundry')) labels.add('qa:foundry');
  if (value.includes('end-to-end') || value.includes('e2e') || value.includes('full-stack')) labels.add('qa:e2e');
  return [...labels];
}

function renderIssueBody(task, content) {
  return [
    `Source: \`${task.sourcePath}\``,
    '',
    `Task ID: ${task.taskId}`,
    `Priority: ${task.priority}`,
    `Dependencies: ${task.dependenciesText || 'None'}`,
    '',
    content.trim(),
  ].join('\n');
}

function readMilestone(root, dir) {
  const content = readBacklogMarkdown(root, dir, 'milestone.md');
  const titleLine = firstMatch(content, /^#\s+(.+)$/m);
  const id = firstMatch(titleLine, /^(M\d+)/);
  return {
    id,
    title: titleLine,
    sourcePath: `${dir}/milestone.md`,
  };
}

function readTask(root, dir, file, milestone) {
  const sourcePath = `${dir}/${file}`;
  const content = readBacklogMarkdown(root, dir, file);
  const heading = firstMatch(content, /^#\s+(.+)$/m);
  const taskId = firstMatch(heading, /^(M\d+\.T\d+)/);
  const title = firstMatch(heading, /^M\d+\.T\d+\s+—\s+(.+)$/);
  const priority = firstMatch(content, /\*\*Priority:\*\*\s+([^\n]+)/) || 'P2';
  const type = firstMatch(content, /\*\*Type:\*\*\s+([^\n]+)/);
  const status = firstMatch(content, /\*\*Status:\*\*\s+([^\n]+)/);
  const dependencies = bulletsFromSection(content, 'Dependencies');
  const qaText = [
    section(content, 'Required QA and test plan'),
    section(content, 'Required evidence to version and attach to the PR'),
    type,
    title,
  ].join('\n');
  const labels = [
    syncManagedLabel,
    `priority:${priority}`,
    inferDomain(type, sourcePath, title),
    ...inferQaLabels(qaText),
  ];
  return {
    taskId,
    title: `[${taskId}] ${title}`,
    sourcePath,
    milestone: milestone.title,
    priority,
    type,
    status,
    dependencies,
    dependenciesText: dependencies.join('; '),
    labels: [...new Set(labels)],
    body: renderIssueBody({
      taskId,
      sourcePath,
      priority,
      dependenciesText: dependencies.join('; '),
    }, content),
  };
}

export function buildImport(root = process.cwd(), { repository = DEFAULT_REPOSITORY } = {}) {
  const backlogRoot = join(root, 'backlog');
  const milestoneDirs = readdirSync(backlogRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('milestones-'))
    .map((entry) => entry.name)
    .sort();
  const milestones = milestoneDirs.map((dir) => readMilestone(backlogRoot, dir));
  const milestoneByDir = new Map(milestoneDirs.map((dir, index) => [dir, milestones[index]]));
  const issues = [];

  for (const dir of milestoneDirs) {
    const taskFiles = readdirSync(join(backlogRoot, dir), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^task-\d+-.+\.md$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    for (const file of taskFiles) {
      issues.push(readTask(backlogRoot, dir, file, milestoneByDir.get(dir)));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    repository,
    milestones,
    labels: labelCatalog,
    issues,
  };
}

export function renderImportOutputs(payload) {
  const files = new Map();
  files.set('issues.json', `${JSON.stringify(payload.issues, null, 2)}\n`);
  files.set('labels.json', `${JSON.stringify(payload.labels, null, 2)}\n`);
  files.set('milestones.json', `${JSON.stringify(payload.milestones, null, 2)}\n`);
  files.set('README.md', `# GitHub Issue Import Dry Run

Generated metadata only. Do not create GitHub issues, labels, or milestones from this folder without human approval.

- Repository: ${payload.repository}
- Milestones: ${payload.milestones.length}
- Issues: ${payload.issues.length}
- Labels: ${payload.labels.length}

Files:

- \`issues.json\`: issue-ready titles, bodies, labels, milestone names, source paths, priorities, and dependencies.
- \`labels.json\`: proposed GitHub label catalog.
- \`milestones.json\`: exact milestone names from backlog markdown.
- \`github-map.json\`: existing GitHub task issue numbers trusted by the sync workflow.
`);
  return files;
}

export function writeOutputs(root, outputDir, payload) {
  const destination = isAbsolute(outputDir) ? outputDir : join(root, outputDir);
  mkdirSync(destination, { recursive: true });
  for (const [file, content] of renderImportOutputs(payload)) {
    writeFileSync(join(destination, file), content);
  }
  return destination;
}

export function checkOutputDrift(root, outputDir, payload) {
  const destination = isAbsolute(outputDir) ? outputDir : join(root, outputDir);
  const drift = [];

  for (const [file, expected] of renderImportOutputs(payload)) {
    const path = join(destination, file);
    const exists = existsSync(path);
    const actual = exists ? readFileSync(path, 'utf8') : '';
    if (!exists || actual !== expected) {
      drift.push({
        file: relative(root, path),
        reason: exists ? 'content differs' : 'missing',
      });
    }
  }

  return {
    ok: drift.length === 0,
    outputDir: relative(root, destination),
    drift,
  };
}
