import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('monorepo folders exist', () => {
  for (const folder of ['frontend', 'backend', 'smartcontract']) {
    assert.equal(existsSync(join(root, folder, 'package.json')), true, `${folder} package.json should exist`);
    assert.equal(existsSync(join(root, folder, 'README.md')), true, `${folder} README.md should exist`);
  }
});

test('repository config points to final repo', () => {
  const config = JSON.parse(readFileSync(join(root, 'config/repository.json'), 'utf8'));
  assert.equal(config.repository, 'https://github.com/arthurlapertosa/duelly');
  assert.equal(config.frontendReferenceApp, '.prototype');
  assert.deepEqual(config.monorepoFolders, ['frontend', 'backend', 'smartcontract']);
  assert.equal(config.humanInTheLoopRequired, true);
});

test('frontend reference app exists outside workspaces', () => {
  assert.equal(existsSync(join(root, '.prototype', 'package.json')), true);
  assert.equal(existsSync(join(root, '.prototype', 'src', 'App.tsx')), true);
});
