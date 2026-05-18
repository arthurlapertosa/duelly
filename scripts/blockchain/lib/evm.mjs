import { functionSelector } from './keccak.mjs';

export function strip0x(value) {
  return typeof value === 'string' && value.startsWith('0x') ? value.slice(2) : value;
}

export function ensureHex(value, label = 'hex') {
  const raw = strip0x(value || '');
  if (!/^[0-9a-fA-F]*$/.test(raw)) {
    throw new Error(`${label} must be hex`);
  }
  return raw.toLowerCase();
}

export function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(value || '');
}

export function isBytes32(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(value || '');
}

export function encodeAddress(address) {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
  return strip0x(address).toLowerCase().padStart(64, '0');
}

export function encodeBytes32(value) {
  if (!isBytes32(value)) throw new Error(`Invalid bytes32: ${value}`);
  return strip0x(value).toLowerCase();
}

export function encodeUint256(value) {
  const n = typeof value === 'bigint' ? value : BigInt(value);
  if (n < 0n) throw new Error('uint256 cannot be negative');
  return n.toString(16).padStart(64, '0');
}

export function calldata(signature, encodedArgs = '') {
  return functionSelector(signature) + encodedArgs;
}

export function decodeUint256(hex) {
  const raw = ensureHex(hex, 'uint256 result');
  if (raw.length === 0) return 0n;
  return BigInt('0x' + raw);
}

export function decodeBytes32(hex) {
  const raw = ensureHex(hex, 'bytes32 result');
  if (raw.length < 64) return null;
  return '0x' + raw.slice(raw.length - 64);
}

export function decodeAbiString(hex) {
  const raw = ensureHex(hex, 'string result');
  if (raw.length === 64) {
    const bytes = raw.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [];
    const end = bytes.findIndex((b) => b === 0);
    const slice = end >= 0 ? bytes.slice(0, end) : bytes;
    return new TextDecoder().decode(new Uint8Array(slice)).trim();
  }
  if (raw.length < 128) return '';
  const offset = Number(BigInt('0x' + raw.slice(0, 64)));
  const lenStart = offset * 2;
  if (raw.length < lenStart + 64) return '';
  const length = Number(BigInt('0x' + raw.slice(lenStart, lenStart + 64)));
  const dataStart = lenStart + 64;
  const data = raw.slice(dataStart, dataStart + length * 2);
  const bytes = data.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export function formatUnits(value, decimals) {
  const n = typeof value === 'bigint' ? value : BigInt(value);
  const d = BigInt(decimals);
  const base = 10n ** d;
  const whole = n / base;
  const fraction = n % base;
  if (d === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(Number(d), '0').replace(/0+$/, '');
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export function assertSelectors() {
  const expected = new Map([
    ['balanceOf(address)', '0x70a08231'],
    ['allowance(address,address)', '0xdd62ed3e'],
    ['symbol()', '0x95d89b41'],
    ['decimals()', '0x313ce567'],
    ['totalSupply()', '0x18160ddd'],
    ['DOMAIN_SEPARATOR()', '0x3644e515'],
    ['nonces(address)', '0x7ecebe00'],
    ['transfer(address,uint256)', '0xa9059cbb'],
  ]);
  for (const [sig, selector] of expected.entries()) {
    const actual = functionSelector(sig);
    if (actual !== selector) throw new Error(`selector mismatch for ${sig}: ${actual} != ${selector}`);
  }
  return true;
}
