import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('smartcontract workspace has expected bootstrap files', () => {
  assert.equal(existsSync(new URL('../README.md', import.meta.url)), true);
  assert.equal(existsSync(new URL('../contracts/.gitkeep', import.meta.url)), true);
  assert.equal(existsSync(new URL('../interfaces/.gitkeep', import.meta.url)), true);
  assert.equal(existsSync(new URL('../foundry.toml', import.meta.url)), true);
});
