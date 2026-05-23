import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../../src/config/env.js';
import { ResolutionMirrorService } from '../../src/modules/orchestration/services/resolution-mirror.service.js';
import type { IndexedBet } from '../../src/modules/orchestration/domain.js';
import type { MirrorCtfPayoutInput } from '../../src/modules/orchestration/chain.js';
import type { CanonicalSportsTemplate } from '../../src/modules/templates/domain/types.js';
import { ctfConditionIdFor } from '../../src/modules/templates/domain/ctf-oracle.js';

const questionId = `0x${'11'.repeat(32)}` as const;
const oracleAddress = '0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74' as const;
const tennisOracleAddress = '0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7' as const;
const negRiskOracleAddress = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' as const;
const unconfiguredOracleAddress = '0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d' as const;
const conditionId = ctfConditionIdFor(oracleAddress, questionId, 2);
const tennisConditionId = ctfConditionIdFor(tennisOracleAddress, questionId, 2);
const negRiskConditionId = ctfConditionIdFor(negRiskOracleAddress, questionId, 2);
const unconfiguredConditionId = ctfConditionIdFor(unconfiguredOracleAddress, questionId, 2);

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
      oracleAddresses: [tennisOracleAddress],
      negRiskOracleAddress,
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

function template(overrides: Partial<CanonicalSportsTemplate> = {}): CanonicalSportsTemplate {
  return {
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId,
    questionId,
    ctfOracleValidationStatus: 'unvalidated',
    ...overrides,
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
      readCtfConditionId: async () => conditionId,
      readCtfPayoutState: async (readConditionId: string, options: { rpcUrl?: string } = {}) => {
        assert.equal(readConditionId, conditionId);
        if (!options.rpcUrl) {
          return {
            conditionId,
            outcomeSlotCount: 2,
            denominator: 0n,
            numerators: [0n, 0n],
          };
        }
        assert.equal(options.rpcUrl, 'https://polygon-rpc.example');
        return {
          conditionId,
          outcomeSlotCount: 2,
          denominator: 1n,
          numerators: [1n, 0n],
        };
      },
      assertAnvilRpc: async () => undefined,
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

test('resolution mirror prefers the validated template CTF oracle over configured fallback', async () => {
  let mirrored: MirrorCtfPayoutInput | undefined;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfPayoutState: async (readConditionId: string, options: { rpcUrl?: string } = {}) => {
        assert.equal(readConditionId, tennisConditionId);
        return {
          conditionId: tennisConditionId,
          outcomeSlotCount: 2,
          denominator: options.rpcUrl ? 1n : 0n,
          numerators: options.rpcUrl ? [0n, 1n] : [0n, 0n],
        };
      },
      assertAnvilRpc: async () => undefined,
      mirrorCtfPayout: async (input: MirrorCtfPayoutInput) => {
        mirrored = input;
        return {
          status: 'mirrored',
          transactionHash: `0x${'05'.repeat(32)}`,
          prepareTransactionHash: null,
          blockNumber: '3',
        };
      },
    } as never,
    async () => template({
      conditionId: tennisConditionId,
      ctfOracleAddress: tennisOracleAddress,
      ctfOracleSource: 'gamma-resolved-by',
      ctfOracleValidationStatus: 'validated',
    }),
  );

  const result = await service.syncBet({ ...bet(), conditionId: tennisConditionId });

  assert.equal(result.status, 'mirrored');
  assert.deepEqual(mirrored, {
    oracleAddress: tennisOracleAddress,
    questionId,
    conditionId: tennisConditionId,
    outcomeSlotCount: 2,
    numerators: [0n, 1n],
  });
});

test('resolution mirror rejects stored template CTF oracle when it is not configured', async () => {
  let sourceReads = 0;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfPayoutState: async () => {
        sourceReads += 1;
        throw new Error('unexpected payout read');
      },
      mirrorCtfPayout: async () => {
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template({
      conditionId: unconfiguredConditionId,
      ctfOracleAddress: unconfiguredOracleAddress,
      ctfOracleSource: 'gamma-resolved-by',
      ctfOracleValidationStatus: 'validated',
    }),
  );

  const result = await service.syncTemplate(template({
    conditionId: unconfiguredConditionId,
    ctfOracleAddress: unconfiguredOracleAddress,
    ctfOracleSource: 'gamma-resolved-by',
    ctfOracleValidationStatus: 'validated',
  }));

  assert.equal(result.status, 'invalid-template');
  assert.equal(sourceReads, 0);
});

test('resolution mirror leaves fork untouched when source CTF is unresolved', async () => {
  let mirrorCalls = 0;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfConditionId: async () => conditionId,
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

test('resolution mirror prepares missing fork CTF condition when source is unresolved', async () => {
  let prepared = false;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfConditionId: async () => conditionId,
      readCtfPayoutState: async (_readConditionId: string, options: { rpcUrl?: string } = {}) => ({
        conditionId,
        outcomeSlotCount: options.rpcUrl ? 2 : 0,
        denominator: 0n,
        numerators: options.rpcUrl ? [0n, 0n] : [],
      }),
      assertAnvilRpc: async () => undefined,
      writePrepareCondition: async () => {
        prepared = true;
        return `0x${'07'.repeat(32)}`;
      },
      wait: async () => ({ blockNumber: 12n }),
      mirrorCtfPayout: async () => {
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template(),
  );

  const result = await service.syncTemplate(template());

  assert.equal(result.status, 'prepared');
  assert.equal(result.prepareTransactionHash, `0x${'07'.repeat(32)}`);
  assert.equal(result.blockNumber, '12');
  assert.equal(prepared, true);
});

test('resolution mirror falls back to negative-risk oracle when condition id matches it', async () => {
  let preparedOracle: string | undefined;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfPayoutState: async (_readConditionId: string, options: { rpcUrl?: string } = {}) => ({
        conditionId: negRiskConditionId,
        outcomeSlotCount: options.rpcUrl ? 2 : 0,
        denominator: 0n,
        numerators: options.rpcUrl ? [0n, 0n] : [],
      }),
      assertAnvilRpc: async () => undefined,
      writePrepareCondition: async (oracle: string) => {
        preparedOracle = oracle;
        return `0x${'08'.repeat(32)}`;
      },
      wait: async () => ({ blockNumber: 13n }),
      mirrorCtfPayout: async () => {
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template({ conditionId: negRiskConditionId }),
  );

  const result = await service.syncTemplate(template({ conditionId: negRiskConditionId }));

  assert.equal(result.status, 'prepared');
  assert.equal(preparedOracle, negRiskOracleAddress);
});

test('resolution mirror no-ops when fork condition is already resolved', async () => {
  let mirrorCalls = 0;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfConditionId: async () => conditionId,
      readCtfPayoutState: async (_readConditionId: string, options: { rpcUrl?: string } = {}) => ({
        conditionId,
        outcomeSlotCount: 2,
        denominator: options.rpcUrl ? 0n : 1n,
        numerators: options.rpcUrl ? [0n, 0n] : [1n, 0n],
      }),
      mirrorCtfPayout: async () => {
        mirrorCalls += 1;
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template(),
  );

  const result = await service.syncTemplate(template());

  assert.equal(result.status, 'already-resolved');
  assert.equal(result.forkDenominator, '1');
  assert.equal(mirrorCalls, 0);
});

test('resolution mirror rejects templates whose conditionId does not match questionId', async () => {
  let sourceReads = 0;
  const invalidConditionId = `0x${'09'.repeat(32)}` as const;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfPayoutState: async () => {
        sourceReads += 1;
        throw new Error('unexpected source read');
      },
      mirrorCtfPayout: async () => {
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template({ conditionId: invalidConditionId }),
  );

  const result = await service.syncTemplate(template({ conditionId: invalidConditionId }));

  assert.equal(result.status, 'invalid-template');
  assert.match(result.error ?? '', /CTF condition id does not match oracle/);
  assert.equal(sourceReads, 0);
});

test('resolution mirror refuses fork CTF writes when the target RPC is not Anvil-compatible', async () => {
  let prepareCalls = 0;
  const service = new ResolutionMirrorService(
    config(),
    {
      readChainId: async () => 137,
      readCtfPayoutState: async (_readConditionId: string, options: { rpcUrl?: string } = {}) => ({
        conditionId,
        outcomeSlotCount: options.rpcUrl ? 2 : 0,
        denominator: 0n,
        numerators: options.rpcUrl ? [0n, 0n] : [],
      }),
      assertAnvilRpc: async () => {
        throw new Error('method not found');
      },
      writePrepareCondition: async () => {
        prepareCalls += 1;
        throw new Error('unexpected prepare');
      },
      mirrorCtfPayout: async () => {
        throw new Error('unexpected mirror');
      },
    } as never,
    async () => template(),
  );

  const result = await service.syncTemplate(template());

  assert.equal(result.status, 'non-local-fork-rpc');
  assert.match(result.error ?? '', /Anvil/);
  assert.equal(prepareCalls, 0);
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
