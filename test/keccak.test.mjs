import test from 'node:test';
import assert from 'node:assert/strict';
import { functionSelector, keccak256Hex } from '../scripts/blockchain/lib/keccak.mjs';
import { assertSelectors, calldata, encodeAddress, encodeBytes32, encodeUint256 } from '../scripts/blockchain/lib/evm.mjs';
import { redactRpcUrl } from '../scripts/blockchain/lib/rpc.mjs';

test('keccak256 matches Ethereum empty hash', () => {
  assert.equal(keccak256Hex(''), 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
});

test('known ERC selectors are stable', () => {
  assert.equal(assertSelectors(), true);
  assert.equal(functionSelector('payoutDenominator(bytes32)'), '0xdd34de67');
  assert.equal(functionSelector('payoutNumerators(bytes32,uint256)'), '0x0504c814');
  assert.equal(functionSelector('getOutcomeSlotCount(bytes32)'), '0xd42dc0c2');
});

test('calldata encoding pads values correctly', () => {
  const address = '0x0000000000000000000000000000000000000001';
  const bytes32 = '0x' + 'ab'.repeat(32);
  assert.equal(encodeAddress(address).length, 64);
  assert.equal(encodeBytes32(bytes32).length, 64);
  assert.equal(encodeUint256(2).length, 64);
  assert.equal(calldata('balanceOf(address)', encodeAddress(address)), '0x70a08231' + '0'.repeat(63) + '1');
});

test('rpc url redaction hides path and query credentials', () => {
  assert.equal(
    redactRpcUrl('https://polygon-mainnet.g.alchemy.com/v2/secretProviderToken'),
    'https://polygon-mainnet.g.alchemy.com/v2/***',
  );
  assert.equal(
    redactRpcUrl('https://rpc.example/path?apikey=secretProviderToken'),
    'https://rpc.example/path?apikey=***',
  );
});
