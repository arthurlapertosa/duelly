import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../../src/config/env.js';
import { TemplateDiscoveryWorker } from '../../src/modules/templates/discovery/template-discovery-worker.service.js';

function config() {
  const base = loadAppConfig();
  return {
    ...base,
    nodeEnv: 'test',
    database: { enabled: true, port: 5432 },
    polymarket: {
      ...base.polymarket,
      discoveryMode: 'live' as const,
      liveDiscoveryEnabled: true,
      templateDiscoveryRefreshIntervalMs: 60_000,
    },
  };
}

test('template discovery worker starts only for live database-backed discovery', () => {
  const worker = new TemplateDiscoveryWorker(
    { ...config(), database: { enabled: false, port: 5432 } },
    { refreshCurrentDiscoverySnapshot: async () => ({}) },
  );

  assert.equal(worker.start(), false);
});

test('template discovery worker skips overlapping ticks', async () => {
  let release!: () => void;
  let refreshes = 0;
  const running = new Promise<void>((resolve) => {
    release = resolve;
  });
  const worker = new TemplateDiscoveryWorker(
    config(),
    {
      refreshCurrentDiscoverySnapshot: async () => {
        refreshes += 1;
        await running;
      },
    },
  );

  const first = worker.tick();
  const second = await worker.tick();
  release();
  const firstResult = await first;

  assert.deepEqual(second, { refreshed: false });
  assert.deepEqual(firstResult, { refreshed: true });
  assert.equal(refreshes, 1);
});
