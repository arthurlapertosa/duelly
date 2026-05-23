import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../../src/config/env.js';
import { ResolutionMirrorService } from '../../src/modules/orchestration/services/resolution-mirror.service.js';
import type { IndexedBet } from '../../src/modules/orchestration/domain.js';
import type { MirrorCtfPayoutInput } from '../../src/modules/orchestration/chain.js';
import type { CanonicalSportsTemplate } from '../../src/modules/templates/domain/types.js';

const conditionId = `0x${'02'.repeat(32)}` as const;
const questionId = `0x${'11'.repeat(32)}` as const;
const oracleAddress = '0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74' as const;

function config() {
  const base = loadAppConfig();
  return {
    ...base,
    nodeEnv: 'test',
    database: { enabled: false, port: 5432 },
    polymarketResolutionMirror: {
      enabled: true,
      sourceRpcUrl: 'https://polygon-rpc.example',
      oracleAddress,
      outcomeSlotCount: 2,
      allowNonLocalForkRpc: true,
    },
    chain: {
      ...base.chain,
      rpcUrl: 'http://127.0.0.1:8545',
    },
  };
}

function bet(): IndexedBet {
  return {
    deploymentKey: 'test-deployment',
    betId: '1',
    inviteId: 'invite-1',
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId,
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
  };
}

function template(): CanonicalSportsTemplate {
  return {
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId,
    questionId,
  } as CanonicalSportsTemplate;
}

test('resolution mirror is disabled unless explicitly configured', async () => {
  const disabledConfig = {
    ...config(),
    polymarketResolutionMirror: { ...config().polymarketResolutionMirror, enabled: false },
  };
  let templateCalls = 0;
  const service = new ResolutionMirrorService(
    disabledConfig,
    {} as never,
    async () => {
      templateCalls += 1;
      return template();
    },
  );

  const result = await service.syncBet(bet());

  assert.equal(result.status, 'disabled');
  assert.equal(templateCalls, 0);
});

test('resolution mirror reads source CTF payout and writes it to the fork as the configured oracle', async () => {
  let mirrored: MirrorCtfPayoutInput | undefined;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async (options?: { rpcUrl?: string }) => {
        assert.equal(options?.rpcUrl ?? 'fork', options?.rpcUrl ? 'https://polygon-rpc.example' : 'fork');
        return 137;
      },
      readCtfPayoutState: async (readConditionId: string, options: { rpcUrl?: string }) => {
        assert.equal(readConditionId, conditionId);
        assert.equal(options.rpcUrl, 'https://polygon-rpc.example');
        return {
          conditionId,
          outcomeSlotCount: 2,
          denominator: 1n,
          numerators: [1n, 0n],
        };
      },
      mirrorCtfPayout: async (input: MirrorCtfPayoutInput) => {
        mirrored = input;
        return {
          status: 'mirrored',
          transactionHash: `0x${'04'.repeat(32)}`,
          prepareTransactionHash: null,
          blockNumber: '2',
        };
      },
    } as never,
    async () => template(),
  );

  const result = await service.syncBet(bet());

  assert.equal(result.status, 'mirrored');
  assert.equal(result.sourceDenominator, '1');
  assert.equal(result.transactionHash, `0x${'04'.repeat(32)}`);
  assert.deepEqual(mirrored, {
    oracleAddress,
    questionId,
    conditionId,
    outcomeSlotCount: 2,
    numerators: [1n, 0n],
  });
});

test('resolution mirror leaves fork untouched when source CTF is unresolved', async () => {
  let mirrorCalls = 0;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfPayoutState: async () => ({
        conditionId,
        outcomeSlotCount: 2,
        denominator: 0n,
        numerators: [0n, 0n],
      }),
      mirrorCtfPayout: async () => {
        mirrorCalls += 1;
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template(),
  );

  const result = await service.syncBet(bet());

  assert.equal(result.status, 'source-unresolved');
  assert.equal(result.sourceDenominator, '0');
  assert.equal(mirrorCalls, 0);
});

test('resolution mirror refuses to write when source or fork chain id is not Polygon', async () => {
  let payoutReads = 0;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async (options?: { rpcUrl?: string }) => options?.rpcUrl ? 1 : 137,
      readCtfPayoutState: async () => {
        payoutReads += 1;
        throw new Error('unexpected payout read');
      },
      mirrorCtfPayout: async () => {
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template(),
  );

  const result = await service.syncBet(bet());

  assert.equal(result.status, 'invalid-chain-id');
  assert.equal(payoutReads, 0);
});
