import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadAppConfig } from '../../src/config/env.js';
import { createDataSource } from '../../src/db/data-source.js';
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';
import {
  CandidateSnapshotEntity,
  RejectedCandidateEntity,
  SportsTemplateEntity,
  TemplatePublishAuditEntity,
} from '../../src/modules/templates/persistence/entities/index.js';
import { M3Repository } from '../../src/modules/m3/repository.js';
import { TemplateRepository } from '../../src/modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../../src/modules/templates/publisher/template-publisher.service.js';

const hasDb = Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_DATABASE));

test('TypeORM repositories persist M1 template records in PostgreSQL', { skip: !hasDb }, async () => {
  const config = loadAppConfig();
  const dataSource = createDataSource(config);
  await dataSource.initialize();
  test.after(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  await dataSource.runMigrations();

  const repository = new TemplateRepository(dataSource);
  const candidates = await loadFixtureCandidates('f1');
  const result = new TemplateFilterService().filter(candidates, { now: new Date('2026-05-19T00:00:00.000Z') });
  const payload = new TemplatePublisherService().buildPublishablePayload(result.accepted[0], 'integration-test');

  await repository.saveCandidates(candidates);
  await repository.saveAcceptedTemplates(result.accepted);
  await repository.saveRejectedCandidates(result.rejected);
  await repository.savePublishAudit(result.accepted[0], payload);

  assert.ok(await dataSource.getRepository(CandidateSnapshotEntity).count() >= candidates.length);
  assert.ok(await dataSource.getRepository(SportsTemplateEntity).count() >= result.accepted.length);
  assert.ok(await dataSource.getRepository(RejectedCandidateEntity).count() >= result.rejected.length);
  assert.ok(await dataSource.getRepository(TemplatePublishAuditEntity).count() >= 1);
});

test('TypeORM repositories persist M3 wallet, invite, relayer, indexer, and resolution records in PostgreSQL', { skip: !hasDb }, async () => {
  const config = loadAppConfig();
  const dataSource = createDataSource(config);
  await dataSource.initialize();
  test.after(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  await dataSource.runMigrations();

  const repository = new M3Repository(dataSource);
  const now = new Date();
  const suffix = randomUUID();
  const userId = `user-m3-integration-maker-${suffix}`;
  const walletId = `wallet-m3-integration-maker-${suffix}`;
  const inviteId = `invite-m3-integration-${suffix}`;
  const attemptId = `attempt-m3-integration-${suffix}`;
  const requestId = `relayer-m3-integration-${suffix}`;
  const eventId = `event-m3-integration-${suffix}`;
  const resolutionAttemptId = `resolution-m3-integration-${suffix}`;
  const betId = String(Date.now());
  const addressSeed = suffix.replaceAll('-', '');
  const maker = `0x${addressSeed.padEnd(40, '0')}` as `0x${string}`;
  const taker = `0x${addressSeed.padEnd(40, '1')}` as `0x${string}`;
  const templateHash = '0x0b28aa25b6eb1b834a251ba9aa935e2af639b1237c979e9ac2343e15dc5a0d7f';
  const conditionId = '0x0808080808080808080808080808080808080808080808080808080808080808';

  await repository.saveUser({
    id: userId,
    email: `m3-maker-${suffix}@example.test`,
    displayIdentifier: 'm3-maker@example.test',
    passwordHash: 'scrypt:test:test',
    createdAt: now,
    updatedAt: now,
  });
  await repository.saveWallet({
    id: walletId,
    userId,
    address: maker,
    chainId: 137,
    active: true,
    verifiedAt: now,
    createdAt: now,
  });

  const foundWallet = await repository.findActiveWalletByAddress(maker.toLowerCase());
  assert.equal(foundWallet?.id, walletId);

  await repository.saveInvite({
    id: inviteId,
    makerUserId: userId,
    takerUserId: null,
    templateHash,
    conditionId,
    makerAddress: maker,
    takerAddress: taker,
    makerOutcomeIndex: 0,
    takerOutcomeIndex: 1,
    stake: '100000000000000000000',
    loserFee: '3000000000000000000',
    offerNonce: '1',
    acceptanceNonce: '2',
    offerHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    offerPayload: { primaryType: 'BetOffer' },
    acceptancePayload: { primaryType: 'BetAcceptance' },
    status: 'funded',
    betId,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.saveRelayerAttempt({
    id: attemptId,
    requestId,
    inviteId,
    action: 'acceptBetWithPermits',
    status: 'succeeded',
    transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    betId,
    error: null,
    payload: { inviteId },
    createdAt: now,
  });
  await repository.saveIndexedEvent({
    id: eventId,
    eventName: 'BetFunded',
    transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    logIndex: 0,
    blockNumber: '100',
    args: { betId },
    createdAt: now,
  });
  await repository.saveIndexedBet({
    betId,
    inviteId,
    templateHash,
    conditionId,
    playerA: maker,
    playerB: taker,
    playerAOutcomeIndex: 0,
    playerBOutcomeIndex: 1,
    stake: '100000000000000000000',
    loserFee: '3000000000000000000',
    status: 'Funded',
    winner: null,
    winnerPayout: null,
    treasuryPayout: null,
    sourceTransactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    sourceBlockNumber: '100',
    updatedAt: now,
  });
  await repository.saveCursor({ id: 'escrow', lastBlockNumber: '100', updatedAt: now });
  await repository.saveResolutionAttempt({
    id: resolutionAttemptId,
    betId,
    status: 'resolved',
    transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    blockNumber: '101',
    error: null,
    createdAt: now,
  });

  assert.equal((await repository.findInviteByBetId(betId))?.id, inviteId);
  assert.equal((await repository.findRelayerAttemptByRequestId(requestId))?.status, 'succeeded');
  assert.equal((await repository.findIndexedBetByInviteId(inviteId))?.betId, betId);
  assert.equal((await repository.findCursor('escrow'))?.lastBlockNumber, '100');
  assert.equal((await repository.findResolutionAttempt(resolutionAttemptId))?.blockNumber, '101');
});
