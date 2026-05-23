#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeAbiParameters, keccak256 } from 'viem';
import { inspectCondition } from '../blockchain/polymarket-condition-inspect.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;
const CTF_PAYOUT_NUMERATORS_SLOT = BigInt(process.env.POLYMARKET_CTF_PAYOUT_NUMERATORS_SLOT ?? '3');
const CTF_PAYOUT_DENOMINATOR_SLOT = BigInt(process.env.POLYMARKET_CTF_PAYOUT_DENOMINATOR_SLOT ?? '4');

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[key] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node scripts/qa/explore-template-ctf-sync.mjs [--deployment-env cache/staging-fork/deployment.env] [--port 3091] [--condition-id <bytes32>]

Starts the backend against a local/staging Anvil Polygon fork, runs template
CTF sync, reverts fork state, and proves sync can recreate the condition.
`);
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function rpc(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status} for ${method}`);
  const body = await response.json();
  if (body.error) throw new Error(`RPC ${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body.result;
}

async function waitForBackend(apiBaseUrl) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Retry until the backend listener is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Backend did not become healthy at ${apiBaseUrl}`);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${url} failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();

  loadEnvFile(path.join(repoRoot, '.env'));
  const deploymentEnv = path.resolve(repoRoot, args.deploymentEnv ?? 'cache/staging-fork/deployment.env');
  loadEnvFile(deploymentEnv);

  const forkRpcUrl = process.env.LOCAL_FORK_RPC_URL ?? process.env.CHAIN_RPC_URL ?? 'http://127.0.0.1:8545';
  const sourceRpcUrl = process.env.POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL ?? process.env.POLYGON_RPC_URL;
  const ctf = process.env.POLYMARKET_CTF_ADDRESS;
  const port = Number.parseInt(String(args.port ?? '3091'), 10);
  const apiBaseUrl = `http://127.0.0.1:${port}`;

  if (!sourceRpcUrl) throw new Error('Missing POLYGON_RPC_URL or POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL');
  if (!ctf) throw new Error('Missing POLYMARKET_CTF_ADDRESS');
  if (!process.env.DATABASE_URL && !(process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_DATABASE)) {
    throw new Error('Missing backend database configuration');
  }

  const chainId = await rpc(forkRpcUrl, 'eth_chainId');
  if (chainId !== '0x89') throw new Error(`Expected local/staging Anvil fork chain id 0x89, got ${chainId}`);

  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'duelly-template-ctf-sync-'));
  const backendLogPath = path.join(logDir, 'backend.log');
  const backendLog = fs.openSync(backendLogPath, 'w');
  let originalSnapshot;
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: 'development',
    CHAIN_ENABLED: 'true',
    CHAIN_RPC_URL: forkRpcUrl,
    CHAIN_ID: '137',
    POLYMARKET_DISCOVERY_MODE: 'live',
    POLYMARKET_LIVE_DISCOVERY_ENABLED: 'true',
    POLYMARKET_ALLOW_NEG_RISK: process.env.POLYMARKET_ALLOW_NEG_RISK ?? 'true',
    POLYMARKET_RESOLUTION_MIRROR_ENABLED: 'true',
    POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL: sourceRpcUrl,
    POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED: 'true',
    POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE: '5',
    POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY: '1',
    RESOLUTION_WORKER_ENABLED: 'false',
    RELAYER_WORKER_ENABLED: 'false',
  };

  const backend = spawn('npm', ['--workspace', 'backend', 'run', 'dev'], {
    cwd: repoRoot,
    env,
    detached: true,
    stdio: ['ignore', backendLog, backendLog],
  });

  try {
    await waitForBackend(apiBaseUrl);
    const templatesResponse = await fetch(`${apiBaseUrl}/templates?mode=live&limit=25`);
    const templatesBody = await templatesResponse.json();
    if (!templatesResponse.ok) throw new Error(`Template fetch failed: ${JSON.stringify(templatesBody)}`);
    const target = args.conditionId
      ? templatesBody.templates.find((template) => template.conditionId.toLowerCase() === String(args.conditionId).toLowerCase())
      : await findMissingForkConditionTemplate(templatesBody.templates, { rpcUrl: forkRpcUrl, ctf });
    if (!target) throw new Error('No accepted live template found for CTF sync exploration');

    originalSnapshot = await rpc(forkRpcUrl, 'anvil_snapshot');
    const forkBeforeRemoval = await inspectCondition({ rpcUrl: forkRpcUrl, ctf, conditionId: target.conditionId, outcomes: 2 });
    const removedExistingCondition = isForkConditionPresent(forkBeforeRemoval);
    if (removedExistingCondition) {
      await removeForkCondition({ rpcUrl: forkRpcUrl, ctf, conditionId: target.conditionId });
      const forkAfterRemoval = await inspectCondition({ rpcUrl: forkRpcUrl, ctf, conditionId: target.conditionId, outcomes: 2 });
      if (isForkConditionPresent(forkAfterRemoval)) {
        throw new Error(`Fork condition removal failed; state is ${JSON.stringify(forkAfterRemoval)}`);
      }
    }

    const missingSnapshot = await rpc(forkRpcUrl, 'anvil_snapshot');
    const firstSync = await postJson(`${apiBaseUrl}/internal/templates/ctf-sync/run`, {
      conditionId: target.conditionId,
      limit: 1,
    });
    const firstResult = firstSync.results?.[0];
    if (!firstResult) throw new Error(`No CTF sync result returned: ${JSON.stringify(firstSync)}`);

    const source = await inspectCondition({ rpcUrl: sourceRpcUrl, ctf, conditionId: target.conditionId, outcomes: 2 });
    const forkAfterFirst = await inspectCondition({ rpcUrl: forkRpcUrl, ctf, conditionId: target.conditionId, outcomes: 2 });
    if (BigInt(source.payoutDenominator) > 0n) {
      if (forkAfterFirst.payoutDenominator !== source.payoutDenominator) {
        throw new Error('Fork payout denominator did not match resolved source denominator');
      }
    } else if (Number(forkAfterFirst.outcomeSlotCount) !== 2) {
      throw new Error(`Fork condition was not prepared; outcome slot count is ${forkAfterFirst.outcomeSlotCount}`);
    }

    const logs = fs.readFileSync(backendLogPath, 'utf8');
    if (!logs.includes(target.conditionId) || !logs.includes(`template CTF sync ${firstResult.status}`)) {
      throw new Error(`Backend log did not include expected CTF sync evidence for ${target.conditionId}`);
    }

    await rpc(forkRpcUrl, 'anvil_revert', [missingSnapshot]);
    const forkAfterRevert = await inspectCondition({ rpcUrl: forkRpcUrl, ctf, conditionId: target.conditionId, outcomes: 2 });
    if (isForkConditionPresent(forkAfterRevert)) {
      throw new Error('Fork condition did not revert to removed state');
    }

    const secondSync = await postJson(`${apiBaseUrl}/internal/templates/ctf-sync/run`, {
      conditionId: target.conditionId,
      limit: 1,
    });
    const secondResult = secondSync.results?.[0];
    if (!secondResult) throw new Error(`No second CTF sync result returned: ${JSON.stringify(secondSync)}`);

    const forkAfterSecond = await inspectCondition({ rpcUrl: forkRpcUrl, ctf, conditionId: target.conditionId, outcomes: 2 });
    if (BigInt(source.payoutDenominator) > 0n) {
      if (forkAfterSecond.payoutDenominator !== source.payoutDenominator) {
        throw new Error('Second sync did not restore resolved fork payout denominator');
      }
    } else if (Number(forkAfterSecond.outcomeSlotCount) !== 2) {
      throw new Error('Second sync did not restore prepared fork condition');
    }

    console.log(JSON.stringify({
      ok: true,
      templateId: target.templateId,
      conditionId: target.conditionId,
      firstStatus: firstResult.status,
      secondStatus: secondResult.status,
      sourceDenominator: source.payoutDenominator,
      forkDenominator: forkAfterSecond.payoutDenominator,
      forkOutcomeSlotCount: forkAfterSecond.outcomeSlotCount,
      removedExistingCondition,
      backendLogPath,
    }, null, 2));
  } finally {
    if (originalSnapshot) {
      try {
        await rpc(forkRpcUrl, 'anvil_revert', [originalSnapshot]);
      } catch {
        // The QA run has already finished or failed; avoid hiding the original result.
      }
    }
    if (backend.pid) {
      try {
        process.kill(-backend.pid, 'SIGTERM');
      } catch {
        backend.kill('SIGTERM');
      }
    }
    fs.closeSync(backendLog);
  }
}

main().catch((error) => {
  console.error(`[explore-template-ctf-sync] ${error.message}`);
  process.exit(1);
});

async function findMissingForkConditionTemplate(templates, { rpcUrl, ctf }) {
  for (const template of templates) {
    const fork = await inspectCondition({ rpcUrl, ctf, conditionId: template.conditionId, outcomes: 2 });
    if (Number(fork.outcomeSlotCount) === 0) return template;
  }
  return templates[0];
}

function isForkConditionPresent(state) {
  return Number(state.outcomeSlotCount) > 0 || BigInt(state.payoutDenominator) > 0n;
}

async function removeForkCondition({ rpcUrl, ctf, conditionId }) {
  await rpc(rpcUrl, 'anvil_setStorageAt', [
    ctf,
    mappingSlot(conditionId, CTF_PAYOUT_NUMERATORS_SLOT),
    ZERO_BYTES32,
  ]);
  await rpc(rpcUrl, 'anvil_setStorageAt', [
    ctf,
    mappingSlot(conditionId, CTF_PAYOUT_DENOMINATOR_SLOT),
    ZERO_BYTES32,
  ]);
}

function mappingSlot(key, slot) {
  return keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }],
    [key, slot],
  ));
}
