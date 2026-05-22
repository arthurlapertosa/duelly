import test from 'node:test';
import assert from 'node:assert/strict';
import { ResolutionWorker } from '../../src/modules/orchestration/services/resolution-worker.service.js';
import { loadAppConfig } from '../../src/config/env.js';
import type { IndexedBet, ResolutionAttempt } from '../../src/modules/orchestration/domain.js';

function config() {
  return {
    ...loadAppConfig(),
    nodeEnv: 'test',
    database: { enabled: false, port: 5432 },
    resolutionWorker: {
      enabled: true,
      intervalMs: 60_000,
      batchSize: 10,
      pendingRetrySeconds: 900,
    },
  };
}

function fundedBet(overrides: Partial<IndexedBet> = {}): IndexedBet {
  return {
    betId: '1',
    inviteId: 'invite-1',
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId: `0x${'02'.repeat(32)}`,
    playerA: '0x0000000000000000000000000000000000000001',
    playerB: '0x0000000000000000000000000000000000000002',
    playerAOutcomeIndex: 0,
    playerBOutcomeIndex: 1,
    stake: '100',
    loserFee: '1',
    status: 'Funded',
    winner: null,
    winnerPayout: null,
    treasuryPayout: null,
    sourceTransactionHash: `0x${'03'.repeat(32)}`,
    sourceBlockNumber: '1',
    updatedAt: new Date('2026-05-22T00:00:00.000Z'),
    ...overrides,
  };
}

test('resolution worker does not start unless enabled', () => {
  const worker = new ResolutionWorker(
    { ...config(), resolutionWorker: { ...config().resolutionWorker, enabled: false } },
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  assert.equal(worker.start(), false);
});

test('resolution worker reindexes before scanning funded bets', async () => {
  const calls: string[] = [];
  const worker = new ResolutionWorker(
    config(),
    {
      findIndexedBetsByStatus: async () => {
        calls.push('scan');
        return [];
      },
    } as never,
    {} as never,
    {
      reindex: async () => {
        calls.push('reindex');
        return {};
      },
    } as never,
    {} as never,
  );

  await worker.tick();

  assert.deepEqual(calls, ['reindex', 'scan']);
});

test('resolution worker records pending without sending a transaction for unresolved CTF data', async () => {
  let resolveCalls = 0;
  let expireCalls = 0;
  const attempts: ResolutionAttempt[] = [];
  const worker = new ResolutionWorker(
    config(),
    {
      findIndexedBetsByStatus: async () => [fundedBet()],
      findLatestResolutionAttemptForBet: async () => undefined,
      saveResolutionAttempt: async (attempt: ResolutionAttempt) => {
        attempts.push(attempt);
        return attempt;
      },
    } as never,
    {
      readPayoutDenominator: async () => 0n,
      readEscrowBet: async () => ({ resolutionDeadline: 1_900_000_000n }),
    } as never,
    { reindex: async () => ({}) } as never,
    {
      recordPending: async (betId: string) => {
        const attempt = {
          id: 'resolution-test',
          betId,
          status: 'pending',
          transactionHash: null,
          blockNumber: null,
          error: 'ConditionUnresolved',
          createdAt: new Date(),
        } as ResolutionAttempt;
        attempts.push(attempt);
        return attempt;
      },
      trigger: async () => {
        resolveCalls += 1;
        throw new Error('unexpected resolve');
      },
      expire: async () => {
        expireCalls += 1;
        throw new Error('unexpected expire');
      },
    } as never,
  );

  const result = await worker.tick(new Date('2026-05-22T00:00:00.000Z'));

  assert.equal(result.pending, 1);
  assert.equal(resolveCalls, 0);
  assert.equal(expireCalls, 0);
  assert.equal(attempts[0].status, 'pending');
});

test('resolution worker calls resolveFromPolymarket when CTF denominator is nonzero', async () => {
  let resolvedBetId: string | null = null;
  const worker = new ResolutionWorker(
    config(),
    {
      findIndexedBetsByStatus: async () => [fundedBet()],
      findLatestResolutionAttemptForBet: async () => undefined,
    } as never,
    {
      readPayoutDenominator: async () => 1n,
    } as never,
    { reindex: async () => ({}) } as never,
    {
      trigger: async (betId: string) => {
        resolvedBetId = betId;
        return {
          id: 'resolution-test',
          betId,
          status: 'resolved',
          transactionHash: `0x${'04'.repeat(32)}`,
          blockNumber: '2',
          error: null,
          createdAt: new Date(),
        };
      },
    } as never,
  );

  const result = await worker.tick();

  assert.equal(resolvedBetId, '1');
  assert.equal(result.resolved, 1);
});

test('resolution worker expires unresolved bets after the on-chain deadline', async () => {
  let expiredBetId: string | null = null;
  const worker = new ResolutionWorker(
    config(),
    {
      findIndexedBetsByStatus: async () => [fundedBet()],
      findLatestResolutionAttemptForBet: async () => undefined,
    } as never,
    {
      readPayoutDenominator: async () => 0n,
      readEscrowBet: async () => ({ resolutionDeadline: 1n }),
    } as never,
    { reindex: async () => ({}) } as never,
    {
      expire: async (betId: string) => {
        expiredBetId = betId;
        return {
          id: 'resolution-test',
          betId,
          status: 'expired',
          transactionHash: `0x${'05'.repeat(32)}`,
          blockNumber: '3',
          error: null,
          createdAt: new Date(),
        };
      },
      recordPending: async () => {
        throw new Error('unexpected pending');
      },
    } as never,
  );

  const result = await worker.tick(new Date('2026-05-22T00:00:00.000Z'));

  assert.equal(expiredBetId, '1');
  assert.equal(result.expired, 1);
});
