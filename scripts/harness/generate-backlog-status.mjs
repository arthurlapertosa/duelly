#!/usr/bin/env node
import { relative } from 'node:path';
import {
  DEFAULT_STATUS_PATH,
  buildBacklogStatus,
  checkBacklogStatusDrift,
  renderBacklogStatus,
  writeBacklogStatus,
} from './lib/backlog-status.mjs';

function usage() {
  console.log(`Usage:
  node scripts/harness/generate-backlog-status.mjs --write [--status-path backlog/status.json]
  node scripts/harness/generate-backlog-status.mjs --check [--status-path backlog/status.json]
  node scripts/harness/generate-backlog-status.mjs --dry-run

The status path is intentionally restricted to backlog/status.json.
`);
}

function parseArgs(argv) {
  const args = { statusPath: DEFAULT_STATUS_PATH, write: false, check: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--write') args.write = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--status-path') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --status-path');
      args.statusPath = value;
      i++;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function selectedModeCount(args) {
  return [args.write, args.check, args.dryRun].filter(Boolean).length;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (selectedModeCount(args) !== 1) {
    throw new Error('Choose exactly one mode: --write, --check, or --dry-run');
  }

  const root = process.cwd();

  if (args.check) {
    const result = checkBacklogStatusDrift(root, args.statusPath);
    if (!result.ok) {
      console.error(`[generate-backlog-status] committed status manifest is stale: ${result.file}`);
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.dryRun) {
    process.stdout.write(renderBacklogStatus(buildBacklogStatus(root)));
    return;
  }

  const result = writeBacklogStatus(root, args.statusPath);
  console.log(JSON.stringify({
    ok: true,
    file: relative(root, result.path),
    milestones: Object.keys(result.status.milestones).length,
    tasks: Object.keys(result.status.tasks).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[generate-backlog-status] ${error.message}`);
  process.exit(1);
});
