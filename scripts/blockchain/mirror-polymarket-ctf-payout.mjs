#!/usr/bin/env node
import { encodeFunctionData, encodePacked, keccak256, parseAbi } from 'viem';
import { inspectCondition } from './polymarket-condition-inspect.mjs';
import { isAddress, isBytes32 } from './lib/evm.mjs';
import { redactRpcUrl } from './lib/rpc.mjs';

const DEFAULT_POLYMARKET_CTF_ORACLE = '0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74';

const ctfAbi = parseAbi([
  'function prepareCondition(address oracle,bytes32 questionId,uint256 outcomeSlotCount)',
  'function reportPayouts(bytes32 questionId,uint256[] payouts)',
]);

function usage() {
  console.log(`Usage:
  node scripts/blockchain/mirror-polymarket-ctf-payout.mjs --source-rpc-url <polygon> --fork-rpc-url <anvil> --ctf <address> --condition-id <bytes32> --question-id <bytes32> [--oracle <address>] [--outcomes 2] [--dry-run]
  node scripts/blockchain/mirror-polymarket-ctf-payout.mjs --self-test

Mirrors resolved Polymarket CTF payout data from live Polygon into a persistent
Anvil fork by impersonating the Polymarket UMA CTF adapter/oracle on the fork.
It never sends live Polygon transactions.

Environment fallbacks:
  POLYGON_RPC_URL
  LOCAL_FORK_RPC_URL / CHAIN_RPC_URL
  POLYMARKET_CTF_ADDRESS
  POLYMARKET_CONDITION_ID
  POLYMARKET_QUESTION_ID
  POLYMARKET_CTF_ORACLE_ADDRESS
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--allow-non-local-fork-rpc') args.allowNonLocalForkRpc = true;
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

function isLocalRpc(url) {
  try {
    const parsed = new URL(url);
    return ['127.0.0.1', 'localhost', '0.0.0.0', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function conditionIdFor({ oracle, questionId, outcomes }) {
  return keccak256(encodePacked(
    ['address', 'bytes32', 'uint256'],
    [oracle, questionId, BigInt(outcomes)],
  ));
}

async function rpc({ rpcUrl, method, params = [] }) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`RPC ${method} failed: ${body.error.message || JSON.stringify(body.error)}`);
  return body.result;
}

async function sendAndWait({ rpcUrl, from, to, data }) {
  const hash = await rpc({ rpcUrl, method: 'eth_sendTransaction', params: [{ from, to, data }] });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const receipt = await rpc({ rpcUrl, method: 'eth_getTransactionReceipt', params: [hash] });
    if (receipt) return { hash, receipt };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for transaction ${hash}`);
}

async function mirrorPayout(input) {
  const {
    sourceRpcUrl,
    forkRpcUrl,
    ctf,
    conditionId,
    questionId,
    oracle,
    outcomes,
    dryRun,
    allowNonLocalForkRpc,
  } = input;

  if (!sourceRpcUrl) throw new Error('Missing --source-rpc-url or POLYGON_RPC_URL');
  if (!forkRpcUrl) throw new Error('Missing --fork-rpc-url, LOCAL_FORK_RPC_URL, or CHAIN_RPC_URL');
  if (!isAddress(ctf)) throw new Error('Missing or invalid --ctf / POLYMARKET_CTF_ADDRESS');
  if (!isBytes32(conditionId)) throw new Error('Missing or invalid --condition-id / POLYMARKET_CONDITION_ID');
  if (!isBytes32(questionId)) throw new Error('Missing or invalid --question-id / POLYMARKET_QUESTION_ID');
  if (!isAddress(oracle)) throw new Error('Missing or invalid --oracle / POLYMARKET_CTF_ORACLE_ADDRESS');
  if (!Number.isInteger(outcomes) || outcomes <= 0) throw new Error('--outcomes must be a positive integer');
  if (!allowNonLocalForkRpc && !isLocalRpc(forkRpcUrl)) {
    throw new Error('Refusing non-local fork RPC; pass --allow-non-local-fork-rpc only for an isolated staging fork');
  }

  const expectedConditionId = conditionIdFor({ oracle, questionId, outcomes });
  if (expectedConditionId.toLowerCase() !== conditionId.toLowerCase()) {
    throw new Error('conditionId does not match oracle, questionId, and outcomes');
  }

  const [sourceChainId, forkChainId] = await Promise.all([
    rpc({ rpcUrl: sourceRpcUrl, method: 'eth_chainId' }),
    rpc({ rpcUrl: forkRpcUrl, method: 'eth_chainId' }),
  ]);
  if (sourceChainId !== '0x89') throw new Error(`Source RPC must be Polygon chain 137, got ${sourceChainId}`);
  if (forkChainId !== '0x89') throw new Error(`Fork RPC must use Polygon chain id 137, got ${forkChainId}`);

  const source = await inspectCondition({
    rpcUrl: sourceRpcUrl,
    ctf,
    conditionId,
    outcomes,
  });
  const forkBefore = await inspectCondition({
    rpcUrl: forkRpcUrl,
    ctf,
    conditionId,
    outcomes,
  });
  const sourceDenominator = BigInt(source.payoutDenominator);
  const sourceNumerators = source.payoutNumerators.map((item) => BigInt(item));

  const baseEvidence = {
    sourceRpcUrl: redactRpcUrl(sourceRpcUrl),
    forkRpcUrl: redactRpcUrl(forkRpcUrl),
    chainId: forkChainId,
    ctf,
    oracle,
    questionId,
    conditionId,
    outcomes,
    expectedConditionId,
    source,
    forkBefore,
  };

  if (sourceDenominator === 0n) {
    return { status: 'source-unresolved', ...baseEvidence, forkAfter: forkBefore };
  }
  if (sourceNumerators.length !== outcomes) {
    throw new Error('source payout numerator count does not match outcomes');
  }
  if (BigInt(forkBefore.payoutDenominator) > 0n) {
    return { status: 'already-resolved', ...baseEvidence, forkAfter: forkBefore };
  }

  const prepareData = encodeFunctionData({
    abi: ctfAbi,
    functionName: 'prepareCondition',
    args: [oracle, questionId, BigInt(outcomes)],
  });
  const reportData = encodeFunctionData({
    abi: ctfAbi,
    functionName: 'reportPayouts',
    args: [questionId, sourceNumerators],
  });

  if (dryRun) {
    return {
      status: 'dry-run',
      ...baseEvidence,
      calldata: {
        prepareCondition: prepareData,
        reportPayouts: reportData,
      },
      forkAfter: forkBefore,
    };
  }

  await rpc({ rpcUrl: forkRpcUrl, method: 'anvil_impersonateAccount', params: [oracle] });
  try {
    await rpc({ rpcUrl: forkRpcUrl, method: 'anvil_setBalance', params: [oracle, '0x56BC75E2D63100000'] });
    let prepareTransactionHash = null;
    if (Number(forkBefore.outcomeSlotCount) === 0) {
      const { hash } = await sendAndWait({ rpcUrl: forkRpcUrl, from: oracle, to: ctf, data: prepareData });
      prepareTransactionHash = hash;
    }
    const { hash, receipt } = await sendAndWait({ rpcUrl: forkRpcUrl, from: oracle, to: ctf, data: reportData });
    const forkAfter = await inspectCondition({
      rpcUrl: forkRpcUrl,
      ctf,
      conditionId,
      outcomes,
    });
    return {
      status: 'mirrored',
      ...baseEvidence,
      transactionHash: hash,
      prepareTransactionHash,
      blockNumber: receipt.blockNumber,
      forkAfter,
    };
  } finally {
    await rpc({ rpcUrl: forkRpcUrl, method: 'anvil_stopImpersonatingAccount', params: [oracle] }).catch(() => undefined);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (args.selfTest) {
    const questionId = `0x${'11'.repeat(32)}`;
    const expectedConditionId = conditionIdFor({
      oracle: DEFAULT_POLYMARKET_CTF_ORACLE,
      questionId,
      outcomes: 2,
    });
    console.log(JSON.stringify({
      ok: true,
      script: 'mirror-polymarket-ctf-payout',
      defaultOracle: DEFAULT_POLYMARKET_CTF_ORACLE,
      sampleQuestionId: questionId,
      sampleConditionId: expectedConditionId,
    }, null, 2));
    return;
  }

  const result = await mirrorPayout({
    sourceRpcUrl: args.sourceRpcUrl || process.env.POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL || process.env.POLYGON_RPC_URL,
    forkRpcUrl: args.forkRpcUrl || process.env.LOCAL_FORK_RPC_URL || process.env.CHAIN_RPC_URL,
    ctf: args.ctf || process.env.POLYMARKET_CTF_ADDRESS,
    conditionId: args.conditionId || process.env.POLYMARKET_CONDITION_ID,
    questionId: args.questionId || process.env.POLYMARKET_QUESTION_ID,
    oracle: args.oracle || process.env.POLYMARKET_CTF_ORACLE_ADDRESS || DEFAULT_POLYMARKET_CTF_ORACLE,
    outcomes: Number(args.outcomes || process.env.POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT || 2),
    dryRun: Boolean(args.dryRun),
    allowNonLocalForkRpc: Boolean(args.allowNonLocalForkRpc || process.env.POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC === 'true'),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[mirror-polymarket-ctf-payout] ${error.message}`);
  process.exit(1);
});
