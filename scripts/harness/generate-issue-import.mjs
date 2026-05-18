#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const DEFAULT_OUTPUT_DIR = 'backlog/github-issue-import';

const labelCatalog = [
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
  { name: 'qa:playwright', color: '0052cc', description: 'Requires Playwright evidence' },
  { name: 'qa:curl', color: '008672', description: 'Requires curl/API evidence' },
  { name: 'qa:foundry', color: '5319e7', description: 'Requires Foundry or smart-contract evidence' },
  { name: 'qa:e2e', color: '006b75', description: 'Requires end-to-end evidence' },
];

function usage() {
  console.log(`Usage:
  node scripts/harness/generate-issue-import.mjs --dry-run [--output-dir backlog/github-issue-import]
`);
}

function parseArgs(argv) {
  const args = { outputDir: DEFAULT_OUTPUT_DIR, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--output-dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --output-dir');
      args.outputDir = value;
      i++;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function firstMatch(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
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
  const path = join(root, dir, 'milestone.md');
  const content = readFileSync(path, 'utf8');
  const titleLine = firstMatch(content, /^#\s+(.+)$/m);
  const id = firstMatch(titleLine, /^(M\d+)/);
  return {
    id,
    title: titleLine,
    sourcePath: `${dir}/milestone.md`,
  };
}

function readTask(root, dir, file, milestone) {
  const path = join(root, dir, file);
  const sourcePath = `${dir}/${file}`;
  const content = readFileSync(path, 'utf8');
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

function buildImport(root = process.cwd()) {
  const backlogRoot = join(root, 'backlog');
  const milestoneDirs = readdirSync(backlogRoot)
    .filter((entry) => entry.startsWith('milestones-'))
    .sort();
  const milestones = milestoneDirs.map((dir) => readMilestone(backlogRoot, dir));
  const milestoneByDir = new Map(milestoneDirs.map((dir, index) => [dir, milestones[index]]));
  const issues = [];

  for (const dir of milestoneDirs) {
    const taskFiles = readdirSync(join(backlogRoot, dir))
      .filter((entry) => /^task-\d+-.+\.md$/.test(entry))
      .sort();
    for (const file of taskFiles) {
      issues.push(readTask(backlogRoot, dir, file, milestoneByDir.get(dir)));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    repository: 'arthurlapertosa/duelly',
    milestones,
    labels: labelCatalog,
    issues,
  };
}

function writeOutputs(root, outputDir, payload) {
  const destination = join(root, outputDir);
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'issues.json'), `${JSON.stringify(payload.issues, null, 2)}\n`);
  writeFileSync(join(destination, 'labels.json'), `${JSON.stringify(payload.labels, null, 2)}\n`);
  writeFileSync(join(destination, 'milestones.json'), `${JSON.stringify(payload.milestones, null, 2)}\n`);
  writeFileSync(join(destination, 'README.md'), `# GitHub Issue Import Dry Run

Generated metadata only. Do not create GitHub issues, labels, or milestones from this folder without human approval.

- Repository: ${payload.repository}
- Milestones: ${payload.milestones.length}
- Issues: ${payload.issues.length}
- Labels: ${payload.labels.length}

Files:

- \`issues.json\`: issue-ready titles, bodies, labels, milestone names, source paths, priorities, and dependencies.
- \`labels.json\`: proposed GitHub label catalog.
- \`milestones.json\`: exact milestone names from backlog markdown.
`);
  return destination;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (!args.dryRun) throw new Error('This script only supports --dry-run; it never creates GitHub issues.');
  const root = process.cwd();
  const payload = buildImport(root);
  const destination = writeOutputs(root, args.outputDir, payload);
  console.log(JSON.stringify({
    ok: true,
    dryRunOnly: true,
    outputDir: relative(root, destination),
    milestones: payload.milestones.length,
    issues: payload.issues.length,
    labels: payload.labels.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[generate-issue-import] ${error.message}`);
  process.exit(1);
});
