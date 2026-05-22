#!/usr/bin/env node
import { calldata, decodeUint256, encodeAddress, encodeUint256, formatUnits, isAddress } from './lib/evm.mjs';
import { ethCall, redactRpcUrl } from './lib/rpc.mjs';

export const DEFAULT_BRL1_SOURCE_HOLDER = '0x2d610e4eceac64e46226b70613b6d7f81e719bc2';
const DEFAULT_GAS_BALANCE_HEX = '0x56BC75E2D63100000';

function usage() {
  console.log(`Usage:
  node scripts/blockchain/seed-fork-brl1.mjs --rpc-url <local anvil url> --wallet <address> [--wallet <address> ...] --amount-brl1 <amount> [--token <address>] [--source-holder <address>] [--allow-non-local-rpc]

Transfers fork-local BRL1 by impersonating a live holder on an Anvil Polygon fork.
No private keys. Refuses non-local RPC URLs unless --allow-non-local-rpc is set.

Environment fallbacks:
  LOCAL_FORK_RPC_URL
  BRL1_ADDRESS_POLYGON / BRL1_TOKEN_ADDRESS
  BRL1_SOURCE_HOLDER
`);
}

export function parseArgs(argv) {
  const args = { wallets: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--allow-non-local-rpc') args.allowNonLocalRpc = true;
    else if (arg === '--wallet') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --wallet');
      args.wallets.push(value);
      i += 1;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[key] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

export function isLocalRpcUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function parseBrl1Amount(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,18})?$/.test(text)) {
    throw new Error('--amount-brl1 must be a positive decimal with up to 18 decimals');
  }
  const [whole, fraction = ''] = text.split('.');
  const parsed = (BigInt(whole) * 10n ** 18n) + BigInt(fraction.padEnd(18, '0'));
  if (parsed <= 0n) throw new Error('--amount-brl1 must be greater than zero');
  return parsed;
}

async function rpc(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

async function waitForReceipt(rpcUrl, hash) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const receipt = await rpc(rpcUrl, 'eth_getTransactionReceipt', [hash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for transaction receipt: ${hash}`);
}

export async function seedForkBrl1(options) {
  const rpcUrl = options.rpcUrl || process.env.LOCAL_FORK_RPC_URL;
  const token = options.token || process.env.BRL1_ADDRESS_POLYGON || process.env.BRL1_TOKEN_ADDRESS;
  const sourceHolder = options.sourceHolder || process.env.BRL1_SOURCE_HOLDER || DEFAULT_BRL1_SOURCE_HOLDER;
  const wallets = options.wallets ?? [];
  const amount = parseBrl1Amount(options.amountBrl1);

  if (!rpcUrl) throw new Error('Missing --rpc-url or LOCAL_FORK_RPC_URL');
  if (!options.allowNonLocalRpc && !isLocalRpcUrl(rpcUrl)) {
    throw new Error('Refusing to seed BRL1 through a non-local RPC without --allow-non-local-rpc');
  }
  if (!isAddress(token)) throw new Error('Missing or invalid --token / BRL1_ADDRESS_POLYGON');
  if (!isAddress(sourceHolder)) throw new Error('Invalid --source-holder / BRL1_SOURCE_HOLDER');
  if (wallets.length === 0) throw new Error('At least one --wallet is required');
  for (const wallet of wallets) {
    if (!isAddress(wallet)) throw new Error(`Invalid wallet address: ${wallet}`);
  }

  const chainId = await rpc(rpcUrl, 'eth_chainId');
  if (chainId !== '0x89') throw new Error(`Expected Polygon chain id 0x89 on fork, got ${chainId}`);

  const total = amount * BigInt(wallets.length);
  const sourceBalance = decodeUint256(await ethCall({
    rpcUrl,
    to: token,
    data: calldata('balanceOf(address)', encodeAddress(sourceHolder)),
  }));
  if (sourceBalance < total) {
    throw new Error(`BRL1 source holder balance ${sourceBalance} is below required ${total}`);
  }

  const transactions = [];
  await rpc(rpcUrl, 'anvil_impersonateAccount', [sourceHolder]);
  try {
    await rpc(rpcUrl, 'anvil_setBalance', [sourceHolder, DEFAULT_GAS_BALANCE_HEX]);
    for (const wallet of wallets) {
      const data = calldata('transfer(address,uint256)', encodeAddress(wallet) + encodeUint256(amount));
      const hash = await rpc(rpcUrl, 'eth_sendTransaction', [{ from: sourceHolder, to: token, data }]);
      const receipt = await waitForReceipt(rpcUrl, hash);
      if (receipt.status !== '0x1') throw new Error(`BRL1 transfer failed: ${hash}`);
      transactions.push({ wallet, transactionHash: hash });
    }
  } finally {
    await rpc(rpcUrl, 'anvil_stopImpersonatingAccount', [sourceHolder]).catch(() => undefined);
  }

  return {
    rpcUrl: redactRpcUrl(rpcUrl),
    chainId,
    token,
    sourceHolder,
    amountRaw: amount.toString(),
    amountFormatted: formatUnits(amount, 18),
    wallets,
    transactions,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  const result = await seedForkBrl1(args);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[seed-fork-brl1] ${error.message}`);
    process.exit(1);
  });
}
