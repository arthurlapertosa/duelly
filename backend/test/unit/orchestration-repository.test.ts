import test from 'node:test';
import assert from 'node:assert/strict';
import type { Address, Hex } from 'viem';
import { OrchestrationRepository } from '../../src/modules/orchestration/repository.js';
import type { BetInvite, IndexedBet, IndexedChainEvent, RelayerAttempt } from '../../src/modules/orchestration/domain.js';

test('repository keeps duplicate bet ids isolated by deployment key', async () => {
  const repository = new OrchestrationRepository();
  await repository.saveIndexedBet(indexedBet({ deploymentKey: 'old-deployment', inviteId: 'old-invite', status: 'Resolved' }));
  await repository.saveIndexedBet(indexedBet({ deploymentKey: 'current-deployment', inviteId: 'current-invite', status: 'Funded' }));

  assert.equal((await repository.findIndexedBet('1', 'old-deployment'))?.inviteId, 'old-invite');
  assert.equal((await repository.findIndexedBet('1', 'current-deployment'))?.inviteId, 'current-invite');
  assert.equal(await repository.findIndexedBetByInviteId('old-invite', 'current-deployment'), undefined);
  assert.deepEqual(
    (await repository.findIndexedBetsByStatus('Funded', 10, 'current-deployment')).map((bet) => bet.inviteId),
    ['current-invite'],
  );
});

test('repository hides stale deployed invites while keeping pre-funding invites visible', async () => {
  const repository = new OrchestrationRepository();
  await repository.saveInvite(invite({ id: 'old-funded', status: 'funded', deploymentKey: 'old-deployment', betId: '1' }));
  await repository.saveInvite(invite({ id: 'current-funded', status: 'funded', deploymentKey: 'current-deployment', betId: '1' }));
  await repository.saveInvite(invite({ id: 'accepted', status: 'accepted', deploymentKey: null, betId: null }));
  await repository.saveInvite(invite({ id: 'draft', status: 'draft', deploymentKey: null, betId: null }));

  assert.deepEqual(
    (await repository.findInvitesByUserId('maker-user', 'current-deployment')).map((item) => item.id).sort(),
    ['accepted', 'current-funded'],
  );
  assert.equal((await repository.findInviteByBetId('1', 'current-deployment'))?.id, 'current-funded');
});

test('repository stores duplicate tx/log events under separate deployments', async () => {
  const repository = new OrchestrationRepository();
  await repository.saveIndexedEvent(indexedEvent({ id: 'event-old', deploymentKey: 'old-deployment' }));
  await repository.saveIndexedEvent(indexedEvent({ id: 'event-current', deploymentKey: 'current-deployment' }));

  assert.equal((await repository.saveIndexedEvent(indexedEvent({ id: 'event-current', deploymentKey: 'current-deployment', eventName: 'BetSettled' }))).eventName, 'BetSettled');
  assert.equal(
    (await repository.findIndexedEventByTransactionHash(`0x${'07'.repeat(32)}`, 'current-deployment', 'BetSettled'))?.id,
    'event-current',
  );
  assert.equal(
    await repository.findIndexedEventByTransactionHash(`0x${'07'.repeat(32)}`, 'missing-deployment'),
    undefined,
  );
});

test('repository atomically claims submitted relayer attempts and reclaims stale locks', async () => {
  const repository = new OrchestrationRepository();
  await repository.saveRelayerAttempt(relayerAttempt({ id: 'fresh', createdAt: new Date('2026-05-22T00:00:00.000Z') }));
  await repository.saveRelayerAttempt(relayerAttempt({
    id: 'locked-fresh',
    status: 'processing',
    lockedAt: new Date('2026-05-22T00:10:00.000Z'),
    createdAt: new Date('2026-05-22T00:01:00.000Z'),
  }));
  await repository.saveRelayerAttempt(relayerAttempt({
    id: 'locked-stale',
    status: 'processing',
    lockedAt: new Date('2026-05-21T23:00:00.000Z'),
    createdAt: new Date('2026-05-22T00:02:00.000Z'),
  }));

  const firstClaim = await repository.claimRelayerAttemptsForProcessing(
    'acceptBetWithPermits',
    'current-deployment',
    10,
    new Date('2026-05-22T00:05:00.000Z'),
  );
  assert.deepEqual(firstClaim.map((attempt) => attempt.id), ['fresh', 'locked-stale']);
  assert.equal(firstClaim.every((attempt) => attempt.status === 'processing' && attempt.lockedAt), true);

  const secondClaim = await repository.claimRelayerAttemptsForProcessing(
    'acceptBetWithPermits',
    'current-deployment',
    10,
    new Date('2026-05-22T00:05:00.000Z'),
  );
  assert.deepEqual(secondClaim.map((attempt) => attempt.id), []);
});

function indexedBet(overrides: Partial<IndexedBet>): IndexedBet {
  return {
    deploymentKey: 'current-deployment',
    betId: '1',
    inviteId: 'invite',
    templateHash: `0x${'01'.repeat(32)}` as Hex,
    conditionId: `0x${'02'.repeat(32)}` as Hex,
    playerA: '0x0000000000000000000000000000000000000001' as Address,
    playerB: '0x0000000000000000000000000000000000000002' as Address,
    playerAOutcomeIndex: 0,
    playerBOutcomeIndex: 1,
    stake: '100',
    loserFee: '3',
    status: 'Funded',
    winner: null,
    winnerPayout: null,
    treasuryPayout: null,
    sourceTransactionHash: `0x${'03'.repeat(32)}` as Hex,
    sourceBlockNumber: '1',
    updatedAt: new Date('2026-05-22T00:00:00.000Z'),
    ...overrides,
  };
}

function invite(overrides: Partial<BetInvite>): BetInvite {
  return {
    id: 'invite',
    makerUserId: 'maker-user',
    takerUserId: 'taker-user',
    recipientEmail: null,
    templateHash: `0x${'01'.repeat(32)}` as Hex,
    conditionId: `0x${'02'.repeat(32)}` as Hex,
    makerAddress: '0x0000000000000000000000000000000000000001' as Address,
    takerAddress: '0x0000000000000000000000000000000000000002' as Address,
    makerOutcomeIndex: 0,
    takerOutcomeIndex: 1,
    stake: '100',
    loserFee: '3',
    offerNonce: '1',
    acceptanceNonce: '2',
    offerHash: `0x${'04'.repeat(32)}` as Hex,
    offerPayload: {},
    offerSignature: `0x${'05'.repeat(65)}` as Hex,
    makerPermit: null,
    makerAuthorizedAt: new Date('2026-05-22T00:00:00.000Z'),
    acceptancePayload: {},
    acceptanceSignature: `0x${'06'.repeat(65)}` as Hex,
    takerPermit: null,
    takerAuthorizedAt: new Date('2026-05-22T00:00:00.000Z'),
    status: 'accepted',
    betId: null,
    deploymentKey: null,
    expiresAt: new Date('2026-06-01T00:00:00.000Z'),
    createdAt: new Date('2026-05-22T00:00:00.000Z'),
    updatedAt: new Date('2026-05-22T00:00:00.000Z'),
    ...overrides,
  };
}

function indexedEvent(overrides: Partial<IndexedChainEvent>): IndexedChainEvent {
  return {
    id: 'event-current',
    deploymentKey: 'current-deployment',
    eventName: 'BetFunded',
    transactionHash: `0x${'07'.repeat(32)}` as Hex,
    logIndex: 1,
    blockNumber: '10',
    args: {},
    createdAt: new Date('2026-05-22T00:00:00.000Z'),
    ...overrides,
  };
}

function relayerAttempt(overrides: Partial<RelayerAttempt>): RelayerAttempt {
  return {
    id: 'attempt',
    requestId: 'request',
    deploymentKey: 'current-deployment',
    inviteId: 'invite',
    action: 'acceptBetWithPermits',
    status: 'submitted',
    transactionHash: null,
    betId: null,
    error: null,
    payload: {},
    createdAt: new Date('2026-05-22T00:00:00.000Z'),
    lockedAt: null,
    ...overrides,
  };
}
