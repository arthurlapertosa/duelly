import test from 'node:test';
import assert from 'node:assert/strict';
import type { Hex } from 'viem';
import { loadAppConfig, type AppConfig } from '../../src/config/env.js';
import { ConditionResolutionStatusService } from '../../src/modules/templates/resolution/condition-resolution-status.service.js';
import { ConditionResolutionStatusEntity } from '../../src/modules/templates/persistence/entities/index.js';

const conditionId = `0x${'ab'.repeat(32)}`;

test('condition resolution service caches unresolved checks until TTL', async () => {
  const repository = new FakeResolutionRepository();
  const chain = new FakeChain([[conditionId, 0n]]);
  const now = new Date('2026-05-22T12:00:00.000Z');
  const service = new ConditionResolutionStatusService(testConfig(), repository as never, chain as never);

  const first = await service.refresh(conditionId, { now });
  const second = await service.refresh(conditionId, { now: new Date('2026-05-22T12:00:30.000Z') });
  const stale = (await service.cachedStatuses([conditionId], new Date('2026-05-22T12:01:01.000Z'))).get(conditionId);

  assert.equal(first.status, 'unresolved');
  assert.equal(second.status, 'unresolved');
  assert.equal(chain.calls.length, 1);
  assert.equal(stale?.status, 'unresolved');
  assert.equal(stale?.needsRefresh, true);
});

test('condition resolution service treats resolved checks as permanent', async () => {
  const repository = new FakeResolutionRepository();
  const chain = new FakeChain([[conditionId, 1n]]);
  const service = new ConditionResolutionStatusService(testConfig(), repository as never, chain as never);

  const first = await service.refresh(conditionId);
  chain.values.set(conditionId, 0n);
  const second = await service.refresh(conditionId);
  const future = (await service.cachedStatuses([conditionId], new Date('2099-01-01T00:00:00.000Z'))).get(conditionId);

  assert.equal(first.status, 'resolved');
  assert.equal(second.status, 'resolved');
  assert.equal(future?.status, 'resolved');
  assert.equal(future?.needsRefresh, false);
  assert.equal(chain.calls.length, 1);
});

test('condition resolution service falls back from source RPC to fork RPC', async () => {
  const repository = new FakeResolutionRepository();
  const chain = new FakeChain([[conditionId, 0n]]);
  chain.failRpcUrls.add('https://source-rpc.example');
  const service = new ConditionResolutionStatusService(testConfig(), repository as never, chain as never);

  const status = await service.refresh(conditionId, { force: true });

  assert.equal(status.status, 'unresolved');
  assert.equal(status.source, 'chain');
  assert.deepEqual(chain.calls.map((call) => call.rpcUrl), ['https://source-rpc.example', 'https://fork-rpc.example']);
});

test('condition resolution service handles RPC failures as unknown', async () => {
  const repository = new FakeResolutionRepository();
  const chain = new FakeChain([[conditionId, 0n]]);
  chain.failRpcUrls.add('https://source-rpc.example');
  chain.failRpcUrls.add('https://fork-rpc.example');
  const service = new ConditionResolutionStatusService(testConfig(), repository as never, chain as never);

  const status = await service.refresh(conditionId, { force: true });

  assert.equal(status.status, 'unknown');
  assert.equal(status.needsRefresh, false);
  assert.match(status.error ?? '', /source/);
  assert.match(status.error ?? '', /chain/);
});

class FakeResolutionRepository {
  readonly records = new Map<string, ConditionResolutionStatusEntity>();

  async findConditionResolutionStatuses(conditionIds: string[]) {
    return conditionIds
      .map((id) => this.records.get(id.toLowerCase()))
      .filter((record): record is ConditionResolutionStatusEntity => Boolean(record));
  }

  async saveConditionResolutionStatus(status: ConditionResolutionStatusEntity) {
    this.records.set(status.conditionId.toLowerCase(), status);
  }
}

class FakeChain {
  readonly calls: Array<{ conditionId: Hex; rpcUrl?: string }> = [];
  readonly values: Map<string, bigint>;
  readonly failRpcUrls = new Set<string>();

  constructor(values: Array<[string, bigint]>) {
    this.values = new Map(values.map(([id, value]) => [id.toLowerCase(), value]));
  }

  async readPayoutDenominator(input: Hex, options: { rpcUrl?: string } = {}) {
    this.calls.push({ conditionId: input, rpcUrl: options.rpcUrl });
    if (options.rpcUrl && this.failRpcUrls.has(options.rpcUrl)) throw new Error(`RPC failed for ${options.rpcUrl}`);
    return this.values.get(input.toLowerCase()) ?? 0n;
  }
}

function testConfig(): AppConfig {
  const config = loadAppConfig();
  return {
    ...config,
    polymarket: {
      ...config.polymarket,
      templateResolutionCacheTtlSeconds: 60,
      templateResolutionRefreshConcurrency: 2,
    },
    polymarketResolutionMirror: {
      ...config.polymarketResolutionMirror,
      sourceRpcUrl: 'https://source-rpc.example',
    },
    chain: {
      ...config.chain,
      rpcUrl: 'https://fork-rpc.example',
      brl1Address: '0x0000000000000000000000000000000000001001',
      escrowAddress: '0x0000000000000000000000000000000000001002',
      polymarketCtfAddress: '0x0000000000000000000000000000000000001003',
    },
  };
}
