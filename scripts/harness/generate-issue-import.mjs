#!/usr/bin/env node
import { relative } from 'node:path';
import {
  DEFAULT_OUTPUT_DIR,
  buildImport,
  checkOutputDrift,
  writeOutputs,
} from './lib/backlog-import.mjs';

function usage() {
  console.log(`Usage:
  node scripts/harness/generate-issue-import.mjs --dry-run [--output-dir backlog/github-issue-import]
  node scripts/harness/generate-issue-import.mjs --check [--output-dir backlog/github-issue-import]
`);
}

function parseArgs(argv) {
  const args = { outputDir: DEFAULT_OUTPUT_DIR, dryRun: false, check: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--check') args.check = true;
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

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (args.dryRun === args.check) {
    throw new Error('Choose exactly one mode: --dry-run or --check');
  }

  const root = process.cwd();
  const payload = buildImport(root);

  if (args.check) {
    const result = checkOutputDrift(root, args.outputDir, payload);
    if (!result.ok) {
      console.error(`[generate-issue-import] committed import metadata is stale: ${result.drift.map((item) => item.file).join(', ')}`);
      console.log(JSON.stringify({
        ...result,
        dryRunOnly: true,
        milestones: payload.milestones.length,
        issues: payload.issues.length,
        labels: payload.labels.length,
      }, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify({
      ok: true,
      dryRunOnly: true,
      outputDir: result.outputDir,
      milestones: payload.milestones.length,
      issues: payload.issues.length,
      labels: payload.labels.length,
    }, null, 2));
    return;
  }

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
