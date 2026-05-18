#!/usr/bin/env node
import { ethCall, redactRpcUrl } from './lib/rpc.mjs';
import {
  assertSelectors,
  calldata,
  decodeUint256,
  encodeBytes32,
  encodeUint256,
  isAddress,
  isBytes32,
} from './lib/evm.mjs';
import { functionSelector } from './lib/keccak.mjs';

function usage() {
  console.log(`Usage:
  node scripts/blockchain/polymarket-condition-inspect.mjs --rpc-url <url> --ctf <address> --condition-id <bytes32> [--outcomes 2] [--block latest]
  node scripts/blockchain/polymarket-condition-inspect.mjs --self-test

Reads Polymarket/Gnosis Conditional Tokens payout state through eth_call.
No private keys. No transactions. No signing.

Environment fallbacks:
  POLYGON_RPC_URL
  POLYMARKET_CTF_ADDRESS
  POLYMARKET_CONDITION_ID
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[key] = value;
      i++;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function maybeCall(label, call) {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    return { ok: false, error: `${label}: ${error.message}` };
  }
}

function interpret(denominator, numerators) {
  if (denominator === 0n) return { status: 'unresolved', winnerIndex: null, voidLike: false };
  if (numerators.length === 0) return { status: 'resolved-empty', winnerIndex: null, voidLike: true };
  const max = numerators.reduce((a, b) => (a > b ? a : b), numerators[0]);
  const winners = numerators.map((n, i) => (n === max && n > 0n ? i : null)).filter((x) => x !== null);
  if (winners.length === 1) return { status: 'resolved', winnerIndex: winners[0], voidLike: false };
  return { status: 'resolved-ambiguous', winnerIndex: null, voidLike: true };
}

export async function inspectCondition({ rpcUrl, ctf, conditionId, outcomes = 2, block = 'latest' }) {
  if (!rpcUrl) throw new Error('Missing --rpc-url or POLYGON_RPC_URL');
  if (!isAddress(ctf)) throw new Error('Missing or invalid --ctf / POLYMARKET_CTF_ADDRESS');
  if (!isBytes32(conditionId)) throw new Error('Missing or invalid --condition-id / POLYMARKET_CONDITION_ID');

  const encodedCondition = encodeBytes32(conditionId);
  const denominatorRaw = await maybeCall('payoutDenominator(bytes32)', () => ethCall({
    rpcUrl,
    to: ctf,
    data: calldata('payoutDenominator(bytes32)', encodedCondition),
    block,
  }));

  const slotCountRaw = await maybeCall('getOutcomeSlotCount(bytes32)', () => ethCall({
    rpcUrl,
    to: ctf,
    data: calldata('getOutcomeSlotCount(bytes32)', encodedCondition),
    block,
  }));

  const outcomeCount = slotCountRaw.ok ? Number(decodeUint256(slotCountRaw.value)) : Number(outcomes);
  const denominator = denominatorRaw.ok ? decodeUint256(denominatorRaw.value) : 0n;
  const numerators = [];
  const errors = [];
  if (!denominatorRaw.ok) errors.push(denominatorRaw.error);
  if (!slotCountRaw.ok) errors.push(slotCountRaw.error);

  for (let i = 0; i < outcomeCount; i++) {
    const raw = await maybeCall(`payoutNumerators(bytes32,uint256)[${i}]`, () => ethCall({
      rpcUrl,
      to: ctf,
      data: calldata('payoutNumerators(bytes32,uint256)', encodedCondition + encodeUint256(i)),
      block,
    }));
    if (raw.ok) numerators.push(decodeUint256(raw.value));
    else errors.push(raw.error);
  }

  return {
    rpcUrl: redactRpcUrl(rpcUrl),
    block,
    ctf,
    conditionId,
    selectors: {
      payoutDenominator: functionSelector('payoutDenominator(bytes32)'),
      payoutNumerators: functionSelector('payoutNumerators(bytes32,uint256)'),
      getOutcomeSlotCount: functionSelector('getOutcomeSlotCount(bytes32)'),
    },
    outcomeSlotCount: outcomeCount,
    payoutDenominator: denominator.toString(),
    payoutNumerators: numerators.map((n) => n.toString()),
    interpretation: interpret(denominator, numerators),
    errors,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (args.selfTest) {
    assertSelectors();
    const checks = {
      payoutDenominator: functionSelector('payoutDenominator(bytes32)'),
      payoutNumerators: functionSelector('payoutNumerators(bytes32,uint256)'),
      getOutcomeSlotCount: functionSelector('getOutcomeSlotCount(bytes32)'),
    };
    console.log(JSON.stringify({ ok: true, script: 'polymarket-condition-inspect', selectors: checks }, null, 2));
    return;
  }

  const result = await inspectCondition({
    rpcUrl: args.rpcUrl || process.env.POLYGON_RPC_URL,
    ctf: args.ctf || process.env.POLYMARKET_CTF_ADDRESS,
    conditionId: args.conditionId || process.env.POLYMARKET_CONDITION_ID,
    outcomes: args.outcomes || 2,
    block: args.block || 'latest',
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[polymarket-condition-inspect] ${error.message}`);
  process.exit(1);
});
