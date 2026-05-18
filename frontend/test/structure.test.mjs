import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('frontend workspace has expected bootstrap files', () => {
  assert.equal(existsSync(new URL('../README.md', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/.gitkeep', import.meta.url)), true);
});
