#!/usr/bin/env node
import { ethCall, redactRpcUrl } from './lib/rpc.mjs';
import {
  assertSelectors,
  calldata,
  decodeAbiString,
  decodeBytes32,
  decodeUint256,
  encodeAddress,
  formatUnits,
  isAddress,
} from './lib/evm.mjs';

function usage() {
  console.log(`Usage:
  node scripts/blockchain/erc20-inspect.mjs --rpc-url <url> --token <address> [--wallet <address>] [--spender <address>] [--block latest]
  node scripts/blockchain/erc20-inspect.mjs --self-test

Reads ERC-20 metadata and ERC-2612 permit signals through eth_call.
No private keys. No transactions. No signing.

Environment fallbacks:
  POLYGON_RPC_URL
  BRL1_ADDRESS_POLYGON
  WALLET_ADDRESS
  SPENDER_ADDRESS
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
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
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

export async function inspectErc20({ rpcUrl, token, wallet, spender, block = 'latest' }) {
  if (!rpcUrl) throw new Error('Missing --rpc-url or POLYGON_RPC_URL');
  if (!isAddress(token)) throw new Error('Missing or invalid --token / BRL1_ADDRESS_POLYGON');
  if (wallet && !isAddress(wallet)) throw new Error('Invalid --wallet / WALLET_ADDRESS');
  if (spender && !isAddress(spender)) throw new Error('Invalid --spender / SPENDER_ADDRESS');

  const symbolRaw = await maybeCall('symbol()', () => ethCall({ rpcUrl, to: token, data: calldata('symbol()'), block }));
  const decimalsRaw = await maybeCall('decimals()', () => ethCall({ rpcUrl, to: token, data: calldata('decimals()'), block }));
  const totalSupplyRaw = await maybeCall('totalSupply()', () => ethCall({ rpcUrl, to: token, data: calldata('totalSupply()'), block }));
  const domainRaw = await maybeCall('DOMAIN_SEPARATOR()', () => ethCall({ rpcUrl, to: token, data: calldata('DOMAIN_SEPARATOR()'), block }));

  const decimals = decimalsRaw.ok ? Number(decodeUint256(decimalsRaw.value)) : null;
  const totalSupply = totalSupplyRaw.ok ? decodeUint256(totalSupplyRaw.value) : null;
  const result = {
    rpcUrl: redactRpcUrl(rpcUrl),
    block,
    token,
    erc20: {
      symbol: symbolRaw.ok ? decodeAbiString(symbolRaw.value) : null,
      decimals,
      totalSupplyRaw: totalSupply === null ? null : totalSupply.toString(),
      totalSupplyFormatted: totalSupply !== null && decimals !== null ? formatUnits(totalSupply, decimals) : null,
    },
    permitSignals: {
      domainSeparator: domainRaw.ok ? decodeBytes32(domainRaw.value) : null,
      domainSeparatorOk: domainRaw.ok && decodeBytes32(domainRaw.value) !== null,
      noncesOk: false,
    },
    balances: {},
    errors: [symbolRaw, decimalsRaw, totalSupplyRaw, domainRaw].filter((x) => !x.ok).map((x) => x.error),
  };

  if (wallet) {
    const balanceRaw = await maybeCall('balanceOf(address)', () => ethCall({ rpcUrl, to: token, data: calldata('balanceOf(address)', encodeAddress(wallet)), block }));
    if (balanceRaw.ok) {
      const balance = decodeUint256(balanceRaw.value);
      result.balances.wallet = {
        address: wallet,
        raw: balance.toString(),
        formatted: decimals !== null ? formatUnits(balance, decimals) : null,
      };
    } else result.errors.push(balanceRaw.error);

    const nonceRaw = await maybeCall('nonces(address)', () => ethCall({ rpcUrl, to: token, data: calldata('nonces(address)', encodeAddress(wallet)), block }));
    if (nonceRaw.ok) {
      result.permitSignals.noncesOk = true;
      result.permitSignals.walletNonce = decodeUint256(nonceRaw.value).toString();
    } else result.errors.push(nonceRaw.error);
  }

  if (wallet && spender) {
    const allowanceRaw = await maybeCall('allowance(address,address)', () => ethCall({ rpcUrl, to: token, data: calldata('allowance(address,address)', encodeAddress(wallet) + encodeAddress(spender)), block }));
    if (allowanceRaw.ok) {
      const allowance = decodeUint256(allowanceRaw.value);
      result.balances.allowance = {
        owner: wallet,
        spender,
        raw: allowance.toString(),
        formatted: decimals !== null ? formatUnits(allowance, decimals) : null,
      };
    } else result.errors.push(allowanceRaw.error);
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  if (args.selfTest) {
    assertSelectors();
    console.log(JSON.stringify({ ok: true, script: 'erc20-inspect', selectors: 'validated' }, null, 2));
    return;
  }

  const result = await inspectErc20({
    rpcUrl: args.rpcUrl || process.env.POLYGON_RPC_URL,
    token: args.token || process.env.BRL1_ADDRESS_POLYGON,
    wallet: args.wallet || process.env.WALLET_ADDRESS,
    spender: args.spender || process.env.SPENDER_ADDRESS,
    block: args.block || 'latest',
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[erc20-inspect] ${error.message}`);
  process.exit(1);
});
