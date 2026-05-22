import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BRL1_SOURCE_HOLDER,
  isLocalRpcUrl,
  parseArgs,
  parseBrl1Amount,
} from '../scripts/blockchain/seed-fork-brl1.mjs';

test('seed-fork-brl1 parses repeated wallets and default source holder is an address', () => {
  const args = parseArgs([
    'node',
    'seed-fork-brl1.mjs',
    '--rpc-url',
    'http://127.0.0.1:8545',
    '--wallet',
    '0x0000000000000000000000000000000000000001',
    '--wallet',
    '0x0000000000000000000000000000000000000002',
    '--amount-brl1',
    '12.5',
  ]);

  assert.equal(args.rpcUrl, 'http://127.0.0.1:8545');
  assert.deepEqual(args.wallets, [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
  ]);
  assert.equal(args.amountBrl1, '12.5');
  assert.match(DEFAULT_BRL1_SOURCE_HOLDER, /^0x[0-9a-f]{40}$/);
});

test('seed-fork-brl1 identifies local and non-local RPC URLs', () => {
  assert.equal(isLocalRpcUrl('http://127.0.0.1:8545'), true);
  assert.equal(isLocalRpcUrl('http://localhost:8545'), true);
  assert.equal(isLocalRpcUrl('https://polygon-rpc.example'), false);
});

test('seed-fork-brl1 converts BRL1 decimals to raw token units', () => {
  assert.equal(parseBrl1Amount('1').toString(), '1000000000000000000');
  assert.equal(parseBrl1Amount('0.000000000000000001').toString(), '1');
  assert.equal(parseBrl1Amount('12.50').toString(), '12500000000000000000');
  assert.throws(() => parseBrl1Amount('0'), /greater than zero/);
  assert.throws(() => parseBrl1Amount('-1'), /positive decimal/);
  assert.throws(() => parseBrl1Amount('1.0000000000000000001'), /up to 18 decimals/);
});
