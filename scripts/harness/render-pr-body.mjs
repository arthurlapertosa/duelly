#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

function usage() {
  console.log(`Usage:
  node scripts/harness/render-pr-body.mjs --task "Task" --summary "Summary" --qa "npm run qa" [--output .pr-body.generated.md]
  node scripts/harness/render-pr-body.mjs --self-test
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[key] = value;
      i++;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function renderPrBody({ task, summary, qa }) {
  const now = new Date().toISOString();
  return `# Summary\n\n${summary}\n\n## Task\n\n${task}\n\n## Scope\n\n- [x] PR opened as draft.\n- [x] Work completed in an independent worktree.\n- [ ] Scope validated by QA/HITL.\n\n## Definition of Done\n\n- [ ] Tests added/updated when behavior changed.\n- [ ] Documentation updated when needed.\n- [ ] No secrets were committed.\n- [ ] Risks and follow-ups are explicit.\n- [ ] Agent did not merge or mark final approval.\n\n## Evidence\n\n### Commands executed\n\n\`\`\`bash\n${qa}\n\`\`\`\n\n### Test results\n\n\`\`\`text\nPending: paste real QA output from the worktree.\n\`\`\`\n\n### Visual or blockchain evidence, when applicable\n\n\`\`\`text\nPending or not applicable.\n\`\`\`\n\n## Local QA\n\n- [ ] ${qa}\n\n## Risks / follow-ups\n\n- Pending human review.\n\n## HITL\n\n- [ ] Human QA approved.\n- [ ] PR can leave draft.\n- [ ] Merge/close decision was made by a human.\n\n---\nGenerated at ${now}\n`;
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (args.selfTest) {
    const body = renderPrBody({ task: 'self-test', summary: 'render test', qa: 'npm run qa' });
    if (!body.includes('HITL') || !body.includes('Definition of Done')) throw new Error('render output missing required sections');
    console.log(JSON.stringify({ ok: true, script: 'render-pr-body' }, null, 2));
    return;
  }
  const task = args.task;
  const summary = args.summary;
  const qa = args.qa || 'npm run qa';
  const output = args.output || '.pr-body.generated.md';
  if (!task || !summary) throw new Error('Missing --task or --summary');
  const body = renderPrBody({ task, summary, qa });
  writeFileSync(output, body, 'utf8');
  console.log(`Wrote ${output}`);
}

main().catch((error) => {
  console.error(`[render-pr-body] ${error.message}`);
  process.exit(1);
});
