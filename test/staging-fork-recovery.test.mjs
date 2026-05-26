import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createBackupMetadata,
  deploymentKeyFromEnv,
  selectCompatibleBackup,
  validateAnvilStateFile,
  validateDeploymentInStateFile,
} from '../scripts/blockchain/lib/staging-fork-recovery.mjs';

const ESCROW_A = '0x1111111111111111111111111111111111111111';
const ESCROW_B = '0x2222222222222222222222222222222222222222';
const DEPLOYMENT_ENV = [
  'CHAIN_ID=137',
  `DUELLY_ESCROW_ADDRESS=${ESCROW_A}`,
  'DUELLY_DEPLOYMENT_BLOCK=100',
  '',
].join('\n');

function state(bestBlockNumber = 150) {
  return {
    block: { number: `0x${bestBlockNumber.toString(16)}` },
    accounts: {
      '0x0000000000000000000000000000000000000001': {
        nonce: 0,
        balance: '0x1',
        code: '0x',
        storage: {},
      },
      [ESCROW_A]: {
        nonce: 1,
        balance: '0x0',
        code: '0x608060405234',
        storage: {},
      },
      [ESCROW_B]: {
        nonce: 1,
        balance: '0x0',
        code: '0x608060405235',
        storage: {},
      },
    },
    best_block_number: bestBlockNumber,
    blocks: {},
    historical_states: {},
    transactions: {},
  };
}

function runScript(script, env) {
  return execFileSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PATH: process.env.PATH,
    },
  });
}

async function tempDir() {
  return await mkdtemp(join(tmpdir(), 'duelly-staging-fork-recovery-'));
}

test('staging fork recovery validates Anvil state shape', async () => {
  const dir = await tempDir();
  try {
    const statePath = join(dir, 'state.json');
    writeFileSync(statePath, JSON.stringify(state(151)), 'utf8');

    const result = validateAnvilStateFile(statePath);
    assert.equal(result.bestBlockNumber, '151');
    assert.equal(result.blockNumber, '151');
    assert.equal(result.accountCount, 3);

    writeFileSync(statePath, '{"block":', 'utf8');
    assert.throws(() => validateAnvilStateFile(statePath), /Invalid Anvil state JSON/);

    writeFileSync(statePath, JSON.stringify({ block: { number: '0x1' }, accounts: {} }), 'utf8');
    assert.throws(() => validateAnvilStateFile(statePath), /best_block_number/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staging fork recovery derives deployment key from deployment env', () => {
  assert.equal(
    deploymentKeyFromEnv({
      CHAIN_ID: '137',
      DUELLY_ESCROW_ADDRESS: '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
      DUELLY_DEPLOYMENT_BLOCK: '42',
    }),
    'chain:137:escrow:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd:block:42',
  );
  assert.equal(deploymentKeyFromEnv({ CHAIN_ID: '137' }), null);
});

test('staging fork recovery validates deployment metadata inside state', async () => {
  const dir = await tempDir();
  try {
    const statePath = join(dir, 'state.json');
    const deploymentEnvPath = join(dir, 'deployment.env');
    writeFileSync(statePath, JSON.stringify(state(151)), 'utf8');
    writeFileSync(deploymentEnvPath, DEPLOYMENT_ENV, 'utf8');

    const deployment = validateDeploymentInStateFile(statePath, deploymentEnvPath);
    assert.equal(deployment.deployment.key, 'chain:137:escrow:0x1111111111111111111111111111111111111111:block:100');
    assert.equal(deployment.deployment.escrowAddress, ESCROW_A);
    assert.match(deployment.deployment.escrowCodeHash, /^[0-9a-f]{64}$/);

    writeFileSync(statePath, JSON.stringify(state(99)), 'utf8');
    assert.throws(() => validateDeploymentInStateFile(statePath, deploymentEnvPath), /behind deployment block/);

    writeFileSync(statePath, JSON.stringify({ ...state(151), accounts: {} }), 'utf8');
    assert.throws(() => validateDeploymentInStateFile(statePath, deploymentEnvPath), /missing accounts|has no accounts/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staging fork recovery selects latest compatible backup', async () => {
  const dir = await tempDir();
  try {
    const deploymentEnvPath = join(dir, 'deployment.env');
    const backupDir = join(dir, 'backups');
    mkdirSync(backupDir);
    writeFileSync(deploymentEnvPath, DEPLOYMENT_ENV, 'utf8');

    for (const [name, block] of [
      ['state.20260526T000000Z.json', 120],
      ['state.20260526T001000Z.json', 160],
    ]) {
      const path = join(backupDir, name);
      writeFileSync(path, JSON.stringify(state(block)), 'utf8');
      writeFileSync(`${path}.meta.json`, JSON.stringify(createBackupMetadata({
        statePath: path,
        deploymentEnvPath,
        createdAt: `2026-05-26T00:${block === 120 ? '00' : '10'}:00.000Z`,
      })), 'utf8');
    }

    const selection = selectCompatibleBackup({ backupDir, deploymentEnvPath });
    assert.equal(selection.reason, 'compatible');
    assert.match(selection.restorePath, /state\.20260526T001000Z\.json$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staging fork recovery skips incompatible and DB-stale backups', async () => {
  const dir = await tempDir();
  try {
    const deploymentEnvPath = join(dir, 'deployment.env');
    const incompatibleEnvPath = join(dir, 'other.env');
    const backupDir = join(dir, 'backups');
    mkdirSync(backupDir);
    writeFileSync(deploymentEnvPath, DEPLOYMENT_ENV, 'utf8');
    writeFileSync(incompatibleEnvPath, DEPLOYMENT_ENV.replace(ESCROW_A, ESCROW_B), 'utf8');

    const stalePath = join(backupDir, 'state.20260526T000000Z.json');
    writeFileSync(stalePath, JSON.stringify(state(120)), 'utf8');
    writeFileSync(`${stalePath}.meta.json`, JSON.stringify(createBackupMetadata({ statePath: stalePath, deploymentEnvPath })), 'utf8');

    const incompatiblePath = join(backupDir, 'state.20260526T001000Z.json');
    writeFileSync(incompatiblePath, JSON.stringify(state(200)), 'utf8');
    writeFileSync(`${incompatiblePath}.meta.json`, JSON.stringify(createBackupMetadata({ statePath: incompatiblePath, deploymentEnvPath: incompatibleEnvPath })), 'utf8');

    const selection = selectCompatibleBackup({ backupDir, deploymentEnvPath, indexedMaxBlock: '150' });
    assert.equal(selection.restorePath, null);
    assert.equal(selection.reason, 'no-compatible-backup');
    assert.deepEqual(selection.skipped.map((item) => item.reason).sort(), ['behind-indexed-events', 'deployment-mismatch']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staging fork backup script writes validated backup and latest symlink', async () => {
  const dir = await tempDir();
  try {
    const statePath = join(dir, 'state.json');
    const backupDir = join(dir, 'backups');
    const deploymentEnvPath = join(dir, 'deployment.env');
    writeFileSync(statePath, JSON.stringify(state(180)), 'utf8');
    writeFileSync(deploymentEnvPath, DEPLOYMENT_ENV, 'utf8');

    const output = runScript('scripts/blockchain/staging-fork-backup.sh', {
      APP_DIR: process.cwd(),
      ANVIL_DIR: dir,
      STATE_FILE: statePath,
      BACKUP_DIR: backupDir,
      DEPLOYMENT_ENV: deploymentEnvPath,
      STAGING_FORK_BACKUP_RETENTION_COUNT: '10',
    });

    assert.match(output, /saved state\./);
    const latest = join(backupDir, 'latest-valid.json');
    assert.doesNotThrow(() => validateAnvilStateFile(latest));
    const latestMetadata = JSON.parse(readFileSync(join(backupDir, 'latest-valid.meta.json'), 'utf8'));
    assert.equal(latestMetadata.deployment.key, 'chain:137:escrow:0x1111111111111111111111111111111111111111:block:100');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staging fork prestart restores backup or marks fresh fork required', async () => {
  const dir = await tempDir();
  try {
    const statePath = join(dir, 'state.json');
    const backupDir = join(dir, 'backups');
    const deploymentEnvPath = join(dir, 'deployment.env');
    mkdirSync(backupDir);
    writeFileSync(deploymentEnvPath, DEPLOYMENT_ENV, 'utf8');

    const backupPath = join(backupDir, 'state.20260526T000000Z.json');
    writeFileSync(backupPath, JSON.stringify(state(200)), 'utf8');
    writeFileSync(`${backupPath}.meta.json`, JSON.stringify(createBackupMetadata({ statePath: backupPath, deploymentEnvPath })), 'utf8');
    writeFileSync(statePath, '{"block":', 'utf8');

    const restoreOutput = runScript('scripts/blockchain/staging-fork-prestart.sh', {
      APP_DIR: process.cwd(),
      ANVIL_DIR: dir,
      STATE_FILE: statePath,
      BACKUP_DIR: backupDir,
      DEPLOYMENT_ENV: deploymentEnvPath,
      RECOVERY_MARKER: join(dir, 'fresh-fork-required'),
      STATE_SOURCE_FILE: join(dir, 'state-source'),
      REQUIRE_DB_RESTORE_GUARD: '0',
    });
    assert.match(restoreOutput, /restored state/);
    assert.equal(validateAnvilStateFile(statePath).bestBlockNumber, '200');

    await rm(backupDir, { recursive: true, force: true });
    mkdirSync(backupDir);
    writeFileSync(statePath, '{"block":', 'utf8');
    const freshOutput = runScript('scripts/blockchain/staging-fork-prestart.sh', {
      APP_DIR: process.cwd(),
      ANVIL_DIR: dir,
      STATE_FILE: statePath,
      BACKUP_DIR: backupDir,
      DEPLOYMENT_ENV: deploymentEnvPath,
      RECOVERY_MARKER: join(dir, 'fresh-fork-required'),
      STATE_SOURCE_FILE: join(dir, 'state-source'),
      REQUIRE_DB_RESTORE_GUARD: '0',
    });
    assert.match(freshOutput, /fresh fork/);
    assert.equal(readFileSync(join(dir, 'fresh-fork-required'), 'utf8').startsWith('fresh-fork-required:'), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('fork deploy owns Anvil jobs while PM2 deploy remains app-only', () => {
  const forkDeploy = readFileSync('scripts/blockchain/deploy-staging-fork.sh', 'utf8');
  const pm2Deploy = readFileSync('scripts/deploy/proxmox-staging-pm2.sh', 'utf8');

  assert.match(forkDeploy, /duelly-anvil-backup\.timer/);
  assert.match(forkDeploy, /duelly-staging-fork-recover\.service/);
  assert.match(forkDeploy, /duelly-anvil\.service\.d/);
  assert.match(forkDeploy, /DEFAULT_STAGING_QA_SEED_WALLETS/);
  assert.match(forkDeploy, /wait_for_state_file_block/);

  const anvilUnit = readFileSync('scripts/blockchain/systemd/duelly-anvil.service', 'utf8');
  assert.match(anvilUnit, /\$\{ANVIL_HOST:-127\.0\.0\.1\}/);
  assert.match(anvilUnit, /ExecStartPost=.*duelly-staging-fork-recover\.service/);
  assert.match(anvilUnit, /NoNewPrivileges=true/);

  const forkPrestart = readFileSync('scripts/blockchain/staging-fork-prestart.sh', 'utf8');
  assert.match(forkPrestart, /indexed_chain_events/);
  assert.match(forkPrestart, /indexed_bets/);
  assert.match(forkPrestart, /indexer_cursors/);

  assert.doesNotMatch(pm2Deploy, /duelly-anvil-backup/);
  assert.doesNotMatch(pm2Deploy, /staging-fork-prestart/);
  assert.doesNotMatch(pm2Deploy, /deploy-staging-fork/);
});
