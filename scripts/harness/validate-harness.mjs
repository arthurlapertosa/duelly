#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'package.json',
  'config/repository.json',
  '.codex/config.toml',
  '.github/pull_request_template.md',
  '.github/workflows/backlog-sync.yml',
  '.github/workflows/qa.yml',
  'backlog/status.json',
  'backlog/server.mjs',
  'backlog/README.md',
  'backlog/github-issue-import/github-map.json',
  'docs/OPERATING_MODEL.md',
  'docs/MONOREPO.md',
  'docs/ARCHITECTURE.md',
  'docs/FINAL_ARCHITECTURE.md',
  'docs/DEFINITION_OF_DONE.md',
  'docs/PR_WORKFLOW.md',
  'docs/QA.md',
  'docs/EVIDENCE.md',
  'docs/BLOCKCHAIN.md',
  'harness/agents/registry.json',
  '.prototype/README.md',
  '.prototype/package.json',
  '.prototype/src/App.tsx',
  '.prototype/src/main.tsx',
  '.prototype/public/favicon.svg',
  'frontend/package.json',
  'frontend/README.md',
  'frontend/src/.gitkeep',
  'backend/package.json',
  'backend/README.md',
  'backend/src/.gitkeep',
  'smartcontract/package.json',
  'smartcontract/README.md',
  'smartcontract/foundry.toml',
  'smartcontract/contracts/.gitkeep',
  'smartcontract/interfaces/.gitkeep',
  'scripts/harness/new-task-worktree.sh',
  'scripts/harness/open-draft-pr.sh',
  'scripts/harness/qa-check.sh',
  'scripts/harness/generate-backlog-status.mjs',
  'scripts/harness/generate-issue-import.mjs',
  'scripts/harness/sync-github-backlog.mjs',
  'scripts/harness/lib/backlog-status.mjs',
  'scripts/harness/lib/backlog-import.mjs',
  'scripts/harness/lib/github-backlog-sync.mjs',
  'scripts/harness/validate-backlog-status.mjs',
  'scripts/blockchain/erc20-inspect.mjs',
  'scripts/blockchain/polymarket-condition-inspect.mjs',
];

const criticalCodexAgents = [
  'harness_pr_coordinator',
  'backend_engineer',
  'frontend_engineer',
  'blockchain_engineer',
  'blockchain_query_operator',
  'qa_reviewer',
  'security_reviewer',
];

function fail(message) {
  throw new Error(message);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function checkRequiredFiles() {
  for (const file of requiredFiles) {
    if (!existsSync(join(root, file))) fail(`Missing required file: ${file}`);
  }
}

function checkRootPackage() {
  const pkg = readJson('package.json');
  if (pkg.name !== 'duelly') fail('Root package name must be duelly');
  const workspaces = new Set(pkg.workspaces || []);
  for (const workspace of ['frontend', 'backend', 'smartcontract']) {
    if (!workspaces.has(workspace)) fail(`Missing workspace: ${workspace}`);
  }
  for (const script of ['validate', 'qa', 'test', 'test:root', 'test:workspaces']) {
    if (!pkg.scripts?.[script]) fail(`Missing root script: ${script}`);
  }
}

function checkRepositoryConfig() {
  const config = readJson('config/repository.json');
  if (config.repository !== 'https://github.com/arthurlapertosa/duelly') fail('Repository URL mismatch');
  if (config.frontendReferenceApp !== '.prototype') fail('frontendReferenceApp must point to .prototype');
  const folders = new Set(config.monorepoFolders || []);
  for (const folder of ['frontend', 'backend', 'smartcontract']) {
    if (!folders.has(folder)) fail(`Repository config missing monorepo folder: ${folder}`);
  }
  if (folders.has(config.frontendReferenceApp)) fail('frontendReferenceApp must not be a workspace');
  if (!config.draftPrRequired && config.requiredPrState !== 'draft') fail('Draft PR must be required');
  if (!config.humanInTheLoopRequired) fail('HITL must be required');
}

function checkWorkspaces() {
  for (const workspace of ['frontend', 'backend', 'smartcontract']) {
    const pkg = readJson(`${workspace}/package.json`);
    if (!pkg.scripts?.test) fail(`${workspace} missing test script`);
    if (!existsSync(join(root, workspace, 'test'))) fail(`${workspace} missing test directory`);
  }
}

function checkAgentsMd() {
  const content = read('AGENTS.md');
  const lines = content.trim().split(/\r?\n/).length;
  if (lines > 150) fail(`AGENTS.md should remain a short index; found ${lines} lines`);
  for (const needle of ['worktree', 'draft', 'HITL', 'Subagents', 'frontend', 'backend', 'smartcontract']) {
    if (!content.includes(needle)) fail(`AGENTS.md missing required concept: ${needle}`);
  }
}

function checkFrontendReferenceApp() {
  const referenceDocs = [
    ['README.md', '.prototype/'],
    ['AGENTS.md', '.prototype/'],
    ['frontend/README.md', '.prototype/'],
    ['docs/MONOREPO.md', '.prototype/'],
    ['docs/OPERATING_MODEL.md', '.prototype/'],
    ['docs/FRONTEND.md', '.prototype/'],
    ['docs/PR_WORKFLOW.md', '.prototype/'],
    ['docs/DEFINITION_OF_DONE.md', '.prototype/'],
    ['.github/pull_request_template.md', '.prototype/'],
    ['.codex/agents/frontend-engineer.toml', '.prototype/'],
    ['.codex/agents/harness-pr-coordinator.toml', '.prototype/'],
    ['.claude/agents/frontend-engineer.md', '.prototype/'],
    ['.claude/agents/harness-pr-coordinator.md', '.prototype/'],
  ];

  for (const [file, needle] of referenceDocs) {
    if (!read(file).includes(needle)) fail(`${file} must reference ${needle}`);
  }

  const frontendDocs = read('docs/FRONTEND.md');
  if (!frontendDocs.includes('1:1')) fail('docs/FRONTEND.md must describe 1:1 parity with .prototype/');
}

function parseTomlString(content, key) {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'));
  return match ? match[1] : null;
}

function checkCodexAgents() {
  const dir = join(root, '.codex/agents');
  const files = readdirSync(dir).filter((f) => f.endsWith('.toml'));
  if (files.length < 6) fail('Expected at least 6 Codex agents');
  const names = new Set();
  for (const file of files) {
    const content = read(`.codex/agents/${file}`);
    const name = parseTomlString(content, 'name');
    const description = parseTomlString(content, 'description');
    const instructions = content.includes('developer_instructions = """');
    if (!name) fail(`${file} missing name`);
    if (!description) fail(`${file} missing description`);
    if (!instructions) fail(`${file} missing developer_instructions`);
    names.add(name);
    if (criticalCodexAgents.includes(name)) {
      if (!content.includes('model_reasoning_effort = "xhigh"')) fail(`${file} must use model_reasoning_effort xhigh`);
      if (!content.includes('model = "gpt-5.5"')) fail(`${file} must use best Codex model default gpt-5.5`);
    }
  }
  for (const agent of criticalCodexAgents) {
    if (!names.has(agent)) fail(`Missing critical Codex agent: ${agent}`);
  }
}

function parseClaudeFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  const frontmatter = content.slice(4, end).trim();
  const values = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) values[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return values;
}

function checkClaudeAgents() {
  const dir = join(root, '.claude/agents');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (files.length < 6) fail('Expected at least 6 Claude agents');
  for (const file of files) {
    const content = read(`.claude/agents/${file}`);
    const fm = parseClaudeFrontmatter(content);
    if (!fm) fail(`${file} missing YAML frontmatter`);
    for (const key of ['name', 'description', 'tools', 'model', 'effort']) {
      if (!fm[key]) fail(`${file} missing frontmatter ${key}`);
    }
    if (fm.model !== 'opus') fail(`${file} should default to best Claude Code model alias opus`);
    if (fm.effort !== 'xhigh') fail(`${file} should use effort xhigh`);
  }
}

function checkPrTemplate() {
  const content = read('.github/pull_request_template.md');
  for (const needle of ['Definition of Done', 'Evidence', 'Evidence paths', 'Local QA', 'HITL', 'draft']) {
    if (!content.includes(needle)) fail(`PR template missing ${needle}`);
  }
  if (!content.includes('.prototype/')) fail('PR template must mention .prototype parity evidence');
}

function checkScriptsExecutable() {
  const scripts = [
    'scripts/harness/new-task-worktree.sh',
    'scripts/harness/open-draft-pr.sh',
    'scripts/harness/close-worktree.sh',
    'scripts/harness/commit-granular.sh',
    'scripts/harness/qa-check.sh',
    'scripts/harness/generate-backlog-status.mjs',
    'scripts/harness/generate-issue-import.mjs',
    'scripts/harness/sync-github-backlog.mjs',
    'scripts/harness/validate-backlog-status.mjs',
    'scripts/blockchain/erc20-inspect.mjs',
    'scripts/blockchain/polymarket-condition-inspect.mjs',
  ];
  for (const script of scripts) {
    const mode = statSync(join(root, script)).mode;
    let gitMode = '';
    try {
      gitMode = execFileSync('git', ['ls-files', '--stage', '--', script], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .trim()
        .split(/\s+/)[0];
    } catch {
      gitMode = '';
    }

    const hasShebang = read(script).startsWith('#!');
    if ((mode & 0o111) === 0 && gitMode !== '100755' && !hasShebang) {
      fail(`${script} is not executable`);
    }
  }
}

function runSelfTests() {
  execFileSync('node', ['scripts/harness/generate-backlog-status.mjs', '--check'], { cwd: root, stdio: 'pipe' });
  execFileSync('node', ['scripts/harness/validate-backlog-status.mjs'], { cwd: root, stdio: 'pipe' });
  execFileSync('node', ['scripts/blockchain/erc20-inspect.mjs', '--self-test'], { cwd: root, stdio: 'pipe' });
  execFileSync('node', ['scripts/blockchain/polymarket-condition-inspect.mjs', '--self-test'], { cwd: root, stdio: 'pipe' });
  execFileSync('node', ['scripts/harness/render-pr-body.mjs', '--self-test'], { cwd: root, stdio: 'pipe' });
  execFileSync('node', ['scripts/harness/generate-issue-import.mjs', '--check'], { cwd: root, stdio: 'pipe' });
  execFileSync('node', ['scripts/harness/generate-issue-import.mjs', '--dry-run', '--output-dir', 'cache/issue-import-self-test'], { cwd: root, stdio: 'pipe' });
}

function main() {
  checkRequiredFiles();
  checkRootPackage();
  checkRepositoryConfig();
  checkWorkspaces();
  checkAgentsMd();
  checkFrontendReferenceApp();
  checkCodexAgents();
  checkClaudeAgents();
  checkPrTemplate();
  checkScriptsExecutable();
  runSelfTests();
  console.log(JSON.stringify({
    ok: true,
    project: 'duelly',
    checks: [
      'files',
      'root-package',
      'repository-config',
      'workspaces',
      'agents-md',
      'frontend-reference',
      'codex-agents',
      'claude-agents',
      'pr-template',
      'scripts',
      'backlog-status',
      'self-tests'
    ]
  }, null, 2));
}

main();
