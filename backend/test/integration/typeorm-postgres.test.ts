import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Address } from 'viem';
import { createApp } from '../../src/app.js';
import { loadAppConfig } from '../../src/config/env.js';
import { createDataSource } from '../../src/db/data-source.js';
import { loadFixtureCandidates } from '../../src/modules/templates/discovery/fixture-loader.js';
import { TemplateFilterService } from '../../src/modules/templates/filtering/template-filter.service.js';
import {
  CandidateSnapshotEntity,
  RejectedCandidateEntity,
  SportsTemplateEntity,
  TemplateCtfSyncStatusEntity,
  TemplatePublishAuditEntity,
} from '../../src/modules/templates/persistence/entities/index.js';
import { OrchestrationRepository } from '../../src/modules/orchestration/repository.js';
import { TemplateRepository } from '../../src/modules/templates/persistence/template-repository.js';
import { TemplatePublisherService } from '../../src/modules/templates/publisher/template-publisher.service.js';

const hasDb = Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_DATABASE));

test('Auth routes persist users and sessions in PostgreSQL', { skip: !hasDb }, async () => {
  const config = loadAppConfig();
  const dataSource = createDataSource(config);
  await dataSource.initialize();
  await dataSource.runMigrations();
  const app = await createApp({ config, dataSource });
  const email = `auth-${randomUUID()}@example.test`;
  let userId: string | undefined;

  test.after(async () => {
    if (dataSource.isInitialized) {
      if (userId) await dataSource.query('delete from auth_sessions where user_id = $1', [userId]);
      await dataSource.query('delete from user_accounts where email = $1', [email]);
    }
    await app.close();
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  const registered = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password-123' },
  });
  assert.equal(registered.statusCode, 200);
  assert.match(registered.json().token, /^[A-Za-z0-9_-]+$/);
  userId = registered.json().user.id;

  const loggedIn = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: 'password-123' },
  });
  assert.equal(loggedIn.statusCode, 200);
  assert.match(loggedIn.json().token, /^[A-Za-z0-9_-]+$/);

  const me = await app.inject({
    method: 'GET',
    url: '/auth/me',
    headers: { authorization: `Bearer ${loggedIn.json().token}` },
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.id, userId);

  const users = await dataSource.query('select id from user_accounts where email = $1', [email]);
  const sessions = await dataSource.query('select id from auth_sessions where user_id = $1', [userId]);
  assert.equal(users.length, 1);
  assert.equal(sessions.length, 2);
});

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
  await repository.saveTemplateCtfSyncStatus({
    conditionId: result.accepted[0].conditionId,
    templateHash: result.accepted[0].templateHash,
    templateId: result.accepted[0].templateId,
    status: 'prepared',
    sourceDenominator: '0',
    forkDenominator: '0',
    prepareTransactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    mirrorTransactionHash: null,
    blockNumber: '1',
    error: null,
    checkedAt: new Date(),
    updatedAt: new Date(),
  });

  assert.ok(await dataSource.getRepository(CandidateSnapshotEntity).count() >= candidates.length);
  assert.ok(await dataSource.getRepository(SportsTemplateEntity).count() >= result.accepted.length);
  assert.ok(await dataSource.getRepository(RejectedCandidateEntity).count() >= result.rejected.length);
  assert.ok(await dataSource.getRepository(TemplatePublishAuditEntity).count() >= 1);
  assert.ok(await dataSource.getRepository(TemplateCtfSyncStatusEntity).count() >= 1);
  assert.equal(
    (await repository.findTemplatesForCtfSync({
      mode: 'live',
      conditionId: result.accepted[0].conditionId,
      limit: 10,
    }))[0]?.templateHash,
    result.accepted[0].templateHash,
  );
});

test('TypeORM repositories persist Wallet, invite, relayer, indexer, and resolution records in PostgreSQL', { skip: !hasDb }, async () => {
  const config = loadAppConfig();
  const dataSource = createDataSource(config);
  await dataSource.initialize();
  const now = new Date();
  const suffix = randomUUID();
  const userId = `user-orchestration-integration-maker-${suffix}`;
  const walletId = `wallet-orchestration-integration-maker-${suffix}`;
  const inviteId = `invite-orchestration-integration-${suffix}`;
  const attemptId = `attempt-orchestration-integration-${suffix}`;
  const requestId = `relayer-orchestration-integration-${suffix}`;
  const eventId = `event-orchestration-integration-${suffix}`;
  const cursorId = `cursor-orchestration-integration-${suffix}`;
  const resolutionAttemptId = `resolution-orchestration-integration-${suffix}`;
  const betId = String(Date.now());
  test.after(async () => {
    if (dataSource.isInitialized) {
      await dataSource.query('delete from resolution_attempts where id = $1', [resolutionAttemptId]);
      await dataSource.query('delete from indexer_cursors where id = $1', [cursorId]);
      await dataSource.query('delete from indexed_bets where bet_id = $1', [betId]);
      await dataSource.query('delete from indexed_chain_events where id = $1', [eventId]);
      await dataSource.query('delete from relayer_attempts where id = $1', [attemptId]);
      await dataSource.query('delete from bet_invites where id = $1', [inviteId]);
      await dataSource.query('delete from linked_wallets where id = $1', [walletId]);
      await dataSource.query('delete from user_accounts where id = $1', [userId]);
      await dataSource.destroy();
    }
  });

  await dataSource.runMigrations();

  const repository = new OrchestrationRepository(dataSource);
  const addressSeed = suffix.replaceAll('-', '');
  const maker = `0x${addressSeed.padEnd(40, '0')}` as Address;
  const taker = `0x${addressSeed.padEnd(40, '1')}` as Address;
  const templateHash = '0x0b28aa25b6eb1b834a251ba9aa935e2af639b1237c979e9ac2343e15dc5a0d7f';
  const conditionId = '0x0808080808080808080808080808080808080808080808080808080808080808';

  await repository.saveUser({
    id: userId,
    email: `maker-${suffix}@example.test`,
    displayIdentifier: 'maker@example.test',
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

  const foundWallet = await repository.findActiveWalletByAddress(maker);
  assert.equal(foundWallet?.id, walletId);
  foundWallet.active = false;
  await repository.saveWallet(foundWallet);
  assert.equal(await repository.findActiveWalletByAddress(maker), undefined);
  assert.equal((await repository.findWalletByAddress(maker))?.id, walletId);
  foundWallet.active = true;
  await repository.saveWallet(foundWallet);

  await repository.saveInvite({
    id: inviteId,
    makerUserId: userId,
    takerUserId: null,
    recipientEmail: null,
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
    offerSignature: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    makerPermit: {
      value: '103000000000000000000',
      nonce: '0',
      deadline: String(Math.floor(now.getTime() / 1000)),
      v: 27,
      r: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      s: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    },
    makerAuthorizedAt: now,
    acceptancePayload: { primaryType: 'BetAcceptance' },
    acceptanceSignature: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    takerPermit: {
      value: '103000000000000000000',
      nonce: '0',
      deadline: String(Math.floor(now.getTime() / 1000)),
      v: 28,
      r: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      s: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    },
    takerAuthorizedAt: now,
    status: 'funded',
    betId,
    deploymentKey: 'integration-deployment',
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.saveRelayerAttempt({
    id: attemptId,
    requestId,
    deploymentKey: 'integration-deployment',
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
    deploymentKey: 'integration-deployment',
    eventName: 'BetFunded',
    transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    logIndex: 0,
    blockNumber: '100',
    args: { betId },
    createdAt: now,
  });
  await repository.saveIndexedBet({
    deploymentKey: 'integration-deployment',
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
  await repository.saveCursor({ id: cursorId, deploymentKey: 'integration-deployment', lastBlockNumber: '100', updatedAt: now });
  await repository.saveResolutionAttempt({
    id: resolutionAttemptId,
    deploymentKey: 'integration-deployment',
    betId,
    status: 'resolved',
    transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    blockNumber: '101',
    error: null,
    createdAt: now,
  });

  assert.equal((await repository.findInviteByBetId(betId))?.id, inviteId);
  assert.equal((await repository.findRelayerAttemptByRequestId(requestId))?.status, 'succeeded');
  assert.equal((await repository.findIndexedEventByTransactionHash(
    '0x2222222222222222222222222222222222222222222222222222222222222222',
    'integration-deployment',
    'BetFunded',
  ))?.blockNumber, '100');
  assert.equal((await repository.findIndexedBetByInviteId(inviteId, 'integration-deployment'))?.betId, betId);
  assert.equal((await repository.findCursor(cursorId, 'integration-deployment'))?.lastBlockNumber, '100');
  assert.equal((await repository.findResolutionAttempt(resolutionAttemptId))?.blockNumber, '101');
});
