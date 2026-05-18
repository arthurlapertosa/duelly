const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const RHO_OFFSETS = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

const MASK_64 = (1n << 64n) - 1n;

function rotl64(value, shift) {
  const s = BigInt(shift % 64);
  if (s === 0n) return value & MASK_64;
  return ((value << s) | (value >> (64n - s))) & MASK_64;
}

function keccakF1600(state) {
  for (const rc of ROUND_CONSTANTS) {
    const c = new Array(5).fill(0n);
    for (let x = 0; x < 5; x++) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }

    const d = new Array(5).fill(0n);
    for (let x = 0; x < 5; x++) {
      d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & MASK_64;
      }
    }

    const b = new Array(25).fill(0n);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const newX = y;
        const newY = (2 * x + 3 * y) % 5;
        b[newX + 5 * newY] = rotl64(state[x + 5 * y], RHO_OFFSETS[x][y]);
      }
    }

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] = (b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y]) & b[((x + 2) % 5) + 5 * y])) & MASK_64;
      }
    }

    state[0] = (state[0] ^ rc) & MASK_64;
  }
}

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof input === 'string') return new TextEncoder().encode(input);
  throw new TypeError('keccak256 input must be a string or Uint8Array');
}

function xorBlockIntoState(state, block) {
  for (let i = 0; i < block.length; i++) {
    const lane = Math.floor(i / 8);
    const shift = BigInt((i % 8) * 8);
    state[lane] = (state[lane] ^ (BigInt(block[i]) << shift)) & MASK_64;
  }
}

function stateToBytes(state, byteLength) {
  const out = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    const lane = Math.floor(i / 8);
    const shift = BigInt((i % 8) * 8);
    out[i] = Number((state[lane] >> shift) & 0xffn);
  }
  return out;
}

export function keccak256Bytes(input) {
  const bytes = toBytes(input);
  const rate = 136; // Keccak-256 rate in bytes.
  const state = new Array(25).fill(0n);

  let offset = 0;
  while (offset + rate <= bytes.length) {
    xorBlockIntoState(state, bytes.slice(offset, offset + rate));
    keccakF1600(state);
    offset += rate;
  }

  const finalBlock = new Uint8Array(rate);
  finalBlock.set(bytes.slice(offset));
  finalBlock[bytes.length - offset] ^= 0x01; // Keccak padding, not FIPS SHA3 padding.
  finalBlock[rate - 1] ^= 0x80;
  xorBlockIntoState(state, finalBlock);
  keccakF1600(state);

  return stateToBytes(state, 32);
}

export function keccak256Hex(input) {
  return Array.from(keccak256Bytes(input), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function functionSelector(signature) {
  return '0x' + keccak256Hex(signature).slice(0, 8);
}
