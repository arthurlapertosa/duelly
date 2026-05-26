#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function usage() {
  console.log(`Usage:
  node scripts/blockchain/lib/staging-fork-recovery.mjs validate-state --state <path>
  node scripts/blockchain/lib/staging-fork-recovery.mjs validate-deployment --state <path> --deployment-env <path>
  node scripts/blockchain/lib/staging-fork-recovery.mjs write-metadata --state <path> --deployment-env <path> --output <path>
  node scripts/blockchain/lib/staging-fork-recovery.mjs select-backup --backup-dir <dir> --deployment-env <path> [--indexed-max-block <number>]
  node scripts/blockchain/lib/staging-fork-recovery.mjs deployment-key --deployment-env <path>
  node scripts/blockchain/lib/staging-fork-recovery.mjs --self-test
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[key] = value;
      i += 1;
    } else {
      args._.push(arg);
    }
  }
  return args;
}

export function readSimpleEnvFile(path) {
  if (!path || !existsSync(path)) return {};
  const env = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

export function deploymentKeyFromEnv(env) {
  const chainId = env.CHAIN_ID || env.LOCAL_FORK_CHAIN_ID;
  const escrow = env.DUELLY_ESCROW_ADDRESS;
  const deploymentBlock = env.DUELLY_DEPLOYMENT_BLOCK;
  if (!chainId || !escrow || !deploymentBlock) return null;
  if (!ADDRESS_RE.test(escrow)) return null;
  if (!/^\d+$/.test(String(chainId))) return null;
  if (!/^\d+$/.test(String(deploymentBlock))) return null;
  return `chain:${chainId}:escrow:${escrow.toLowerCase()}:block:${deploymentBlock}`;
}

function parseBlockNumber(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === 'bigint' && value >= 0n) return value;
  if (typeof value === 'string') {
    if (/^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
    if (/^\d+$/.test(value)) return BigInt(value);
  }
  throw new Error(`Invalid block number: ${String(value)}`);
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function validateAnvilStateFile(path) {
  if (!path || !existsSync(path)) throw new Error(`State file does not exist: ${path}`);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid Anvil state JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Anvil state must be a JSON object');
  if (!parsed.accounts || typeof parsed.accounts !== 'object' || Array.isArray(parsed.accounts)) {
    throw new Error('Anvil state is missing accounts');
  }
  if (!parsed.block || typeof parsed.block !== 'object' || Array.isArray(parsed.block)) {
    throw new Error('Anvil state is missing block');
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'best_block_number')) {
    throw new Error('Anvil state is missing best_block_number');
  }
  const bestBlockNumber = parseBlockNumber(parsed.best_block_number);
  const blockNumber = parseBlockNumber(parsed.block.number);
  const accountCount = Object.keys(parsed.accounts).length;
  if (accountCount === 0) throw new Error('Anvil state has no accounts');
  return {
    path,
    bestBlockNumber: bestBlockNumber.toString(),
    blockNumber: blockNumber.toString(),
    accountCount,
    sha256: sha256File(path),
  };
}

function accountCodeFromState(state, address) {
  const accounts = state?.accounts;
  if (!accounts || typeof accounts !== 'object') return null;
  const normalized = address.toLowerCase();
  for (const [key, account] of Object.entries(accounts)) {
    if (key.toLowerCase() !== normalized || !account || typeof account !== 'object') continue;
    const candidates = [
      account.code,
      account.info?.code,
      account.account?.code,
      account.account?.info?.code,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string') return candidate;
    }
  }
  return null;
}

export function validateDeploymentInStateFile(statePath, deploymentEnvPath) {
  const stateInfo = validateAnvilStateFile(statePath);
  const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
  const deploymentEnv = readSimpleEnvFile(deploymentEnvPath);
  const deploymentKey = deploymentKeyFromEnv(deploymentEnv);
  if (!deploymentKey) throw new Error('Deployment env does not contain a valid deployment key');

  const deploymentBlock = parseBlockNumber(deploymentEnv.DUELLY_DEPLOYMENT_BLOCK);
  if (parseBlockNumber(stateInfo.bestBlockNumber) < deploymentBlock) {
    throw new Error(`Anvil state block ${stateInfo.bestBlockNumber} is behind deployment block ${deploymentBlock.toString()}`);
  }

  const escrowAddress = deploymentEnv.DUELLY_ESCROW_ADDRESS;
  const escrowCode = accountCodeFromState(parsed, escrowAddress);
  if (!escrowCode || escrowCode === '0x') {
    throw new Error(`Anvil state does not contain deployed escrow code at ${escrowAddress}`);
  }

  return {
    state: stateInfo,
    deployment: {
      key: deploymentKey,
      chainId: deploymentEnv.CHAIN_ID || deploymentEnv.LOCAL_FORK_CHAIN_ID || null,
      escrowAddress,
      deploymentBlock: deploymentEnv.DUELLY_DEPLOYMENT_BLOCK,
      escrowCodeHash: sha256Text(escrowCode.toLowerCase()),
    },
  };
}

export function createBackupMetadata({ statePath, deploymentEnvPath, createdAt = new Date().toISOString() }) {
  const deploymentState = validateDeploymentInStateFile(statePath, deploymentEnvPath);
  return {
    version: 1,
    createdAt,
    stateFile: basename(statePath),
    state: deploymentState.state,
    deployment: deploymentState.deployment,
  };
}

function readMetadata(path) {
  const metadataPath = `${path}.meta.json`;
  if (!existsSync(metadataPath)) return null;
  return JSON.parse(readFileSync(metadataPath, 'utf8'));
}

function backupCandidates(backupDir) {
  if (!backupDir || !existsSync(backupDir)) return [];
  return readdirSync(backupDir)
    .filter((entry) => /^state\.\d{8}T\d{6}Z\.json$/.test(entry))
    .map((entry) => {
      const path = join(backupDir, entry);
      return { path, name: entry, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((left, right) => right.name.localeCompare(left.name) || right.mtimeMs - left.mtimeMs);
}

export function selectCompatibleBackup({ backupDir, deploymentEnvPath, indexedMaxBlock }) {
  const deploymentKey = deploymentKeyFromEnv(readSimpleEnvFile(deploymentEnvPath));
  const indexed = indexedMaxBlock === undefined || indexedMaxBlock === null || indexedMaxBlock === ''
    ? null
    : parseBlockNumber(String(indexedMaxBlock));
  const skipped = [];

  if (!deploymentKey) {
    return {
      restorePath: null,
      reason: 'missing-current-deployment',
      skipped,
    };
  }

  for (const candidate of backupCandidates(backupDir)) {
    let state;
    let metadata;
    try {
      state = validateAnvilStateFile(candidate.path);
      const deploymentState = validateDeploymentInStateFile(candidate.path, deploymentEnvPath);
      metadata = readMetadata(candidate.path);
      if (!metadata) {
        skipped.push({ path: candidate.path, reason: 'missing-metadata' });
        continue;
      }
      if (metadata.deployment?.key !== deploymentKey) {
        skipped.push({ path: candidate.path, reason: 'deployment-mismatch' });
        continue;
      }
      if (metadata.state?.sha256 && metadata.state.sha256 !== state.sha256) {
        skipped.push({ path: candidate.path, reason: 'sha256-mismatch' });
        continue;
      }
      if (metadata.deployment?.escrowCodeHash && metadata.deployment.escrowCodeHash !== deploymentState.deployment.escrowCodeHash) {
        skipped.push({ path: candidate.path, reason: 'escrow-code-mismatch' });
        continue;
      }
      if (indexed !== null && parseBlockNumber(state.bestBlockNumber) < indexed) {
        skipped.push({
          path: candidate.path,
          reason: 'behind-indexed-events',
          stateBlock: state.bestBlockNumber,
          indexedBlock: indexed.toString(),
        });
        continue;
      }
      return {
        restorePath: candidate.path,
        reason: 'compatible',
        state,
        metadata,
        skipped,
      };
    } catch (error) {
      skipped.push({ path: candidate.path, reason: error.message });
    }
  }

  return {
    restorePath: null,
    reason: 'no-compatible-backup',
    skipped,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (args.selfTest) {
    console.log(JSON.stringify({ ok: true, script: 'staging-fork-recovery' }, null, 2));
    return;
  }
  const command = args._[0];
  if (command === 'validate-state') {
    console.log(JSON.stringify(validateAnvilStateFile(args.state), null, 2));
  } else if (command === 'validate-deployment') {
    console.log(JSON.stringify(validateDeploymentInStateFile(args.state, args.deploymentEnv), null, 2));
  } else if (command === 'write-metadata') {
    const metadata = createBackupMetadata({ statePath: args.state, deploymentEnvPath: args.deploymentEnv });
    writeFileSync(args.output, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ ok: true, output: args.output }, null, 2));
  } else if (command === 'select-backup') {
    console.log(JSON.stringify(selectCompatibleBackup({
      backupDir: args.backupDir,
      deploymentEnvPath: args.deploymentEnv,
      indexedMaxBlock: args.indexedMaxBlock,
    }), null, 2));
  } else if (command === 'deployment-key') {
    const key = deploymentKeyFromEnv(readSimpleEnvFile(args.deploymentEnv));
    if (!key) throw new Error('Deployment env does not contain a valid deployment key');
    console.log(key);
  } else {
    throw new Error(`Unknown command: ${command || '<missing>'}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[staging-fork-recovery] ${error.message}`);
    process.exit(1);
  });
}
