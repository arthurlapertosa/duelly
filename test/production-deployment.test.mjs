import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const productionDeployScript = 'scripts/blockchain/deploy-production-polygon.sh';
const productionPm2Script = 'scripts/deploy/proxmox-production-pm2.sh';
const productionFrontendEnvScript = 'scripts/dev/write-production-frontend-env.sh';

function bash(args) {
  return execFileSync('bash', args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: process.env.PATH,
    },
  });
}

test('production deployment scripts are valid bash', () => {
  for (const script of [productionDeployScript, productionPm2Script, productionFrontendEnvScript]) {
    assert.doesNotThrow(() => bash(['-n', script]), script);
  }
});

test('production deploy script self-test writes production-only deployment env', () => {
  const output = bash([productionDeployScript, '--self-test']);
  assert.match(output, /self-test ok/);

  const script = readFileSync(productionDeployScript, 'utf8');
  assert.match(script, /EXPECTED_RELAYER_ADDRESS="\$\{EXPECTED_RELAYER_ADDRESS:-0x02Ee8283927d7e3Fd3f3f392a8E7e14E4E986785\}"/);
  assert.match(script, /required_env POLYGONSCAN_API_KEY/);
  assert.match(script, /cast chain-id --rpc-url "\$POLYGON_RPC_URL"/);
  assert.match(script, /CHAIN_ID=137/);
  assert.match(script, /POLYMARKET_DISCOVERY_MODE=live/);
  assert.match(script, /POLYMARKET_ALLOW_NEG_RISK=false/);
  assert.match(script, /POLYMARKET_RESOLUTION_MIRROR_ENABLED=false/);
  assert.match(script, /POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED=false/);
  assert.doesNotMatch(script, /LOCAL_FORK_RPC_URL=/);
  assert.doesNotMatch(script, /QA_MAKER_PRIVATE_KEY=/);
  assert.doesNotMatch(script, /QA_TAKER_PRIVATE_KEY=/);
});

test('production frontend env writer self-test rejects QA wallets', () => {
  const output = bash([productionFrontendEnvScript, '--self-test']);
  assert.match(output, /production self-test ok/);

  const script = readFileSync(productionFrontendEnvScript, 'utf8');
  assert.match(script, /VITE_DUELLY_API_MODE=http/);
  assert.match(script, /VITE_DUELLY_TEMPLATE_MODE=live/);
  assert.match(script, /VITE_API_BASE_URL=\$frontend_api_base_url/);
  assert.match(script, /VITE_ALLOWED_HOSTS=\$frontend_allowed_hosts/);
  assert.match(script, /VITE_QA_WALLET=false/);
  assert.match(script, /refusing production env with VITE_QA_WALLET=true/);
  assert.match(script, /refusing production env with QA private keys set/);
});

test('production PM2 wrapper uses production paths, names, and checks', () => {
  const script = readFileSync(productionPm2Script, 'utf8');
  assert.match(script, /APP_DIR="\$\{APP_DIR:-\/opt\/duelly\/prod\}"/);
  assert.match(script, /cache\/production\/deployment\.env/);
  assert.match(script, /duelly-prod-backend/);
  assert.match(script, /duelly-prod-frontend/);
  assert.match(script, /\/var\/log\/duelly\/production/);
  assert.match(script, /write-production-frontend-env\.sh/);
  assert.match(script, /npm --workspace backend run build/);
  assert.match(script, /npm --workspace frontend run build/);
  assert.match(script, /npm --workspace backend run db:migration:run:prod/);
  assert.match(script, /\/health/);
  assert.match(script, /\/ready/);
});
