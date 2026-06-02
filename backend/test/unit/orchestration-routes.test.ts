import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeAbiParameters,
  numberToHex,
  pad,
  parseAbiParameters,
  parseSignature,
  toEventSelector,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createApp } from '../../src/app.js';
import { loadAppConfig } from '../../src/config/env.js';
import { BetsController } from '../../src/controllers/orchestration/bets.controller.js';
import { betAcceptanceTypes, betOfferTypes } from '../../src/modules/orchestration/chain.js';
import type { BetInvite, IndexedBet, RelayerAttempt } from '../../src/modules/orchestration/domain.js';
import { inviteToAcceptance, inviteToOffer } from '../../src/modules/orchestration/services/invite-payloads.js';
import { RelayerService, relayerErrorCode } from '../../src/modules/orchestration/services/relayer.service.js';

const maker = privateKeyToAccount('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
const taker = privateKeyToAccount('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

test('relayer maps local contract reverts to stable API error codes', () => {
  assert.equal(relayerErrorCode(new Error('execution reverted: custom error 0xfa674946')), 'TEMPLATE_NOT_REGISTERED_ON_CHAIN');
  assert.equal(relayerErrorCode({ data: { errorName: 'TemplateNotRegistered' } }), 'TEMPLATE_NOT_REGISTERED_ON_CHAIN');
  assert.equal(relayerErrorCode({ cause: { data: { errorName: 'TemplateClosed' } } }), 'TEMPLATE_CLOSED');
  assert.equal(relayerErrorCode({ cause: { data: { errorName: 'ConditionResolved' } } }), 'CONDITION_RESOLVED');
});

test('relayer queues missing accepted template registration before funding', async () => {
  const attempts: RelayerAttempt[] = [];
  let registeredTemplateHash: string | null = null;
  const templateHash = `0x${'01'.repeat(32)}` as const;
  const invite = {
    id: 'invite-test',
    templateHash,
  } as BetInvite;
  const fundingAttempt = {
    id: 'attempt-funding',
    requestId: 'relayer-test',
    deploymentKey: 'test-deployment',
    inviteId: invite.id,
    action: 'acceptBetWithPermits',
    status: 'submitted',
    transactionHash: null,
    betId: null,
    error: null,
    payload: { inviteId: invite.id },
    createdAt: new Date(),
  } satisfies RelayerAttempt;
  const service = new RelayerService(
    {
      findLatestRelayerAttemptForInviteAction: async () => undefined,
      saveRelayerAttempt: async (attempt: RelayerAttempt) => {
        attempts.push(attempt);
        return attempt;
      },
    } as never,
    {
      readTemplate: async () => ({ registered: false, active: false }),
      writeRegisterTemplate: async (template: { templateHash: string }) => {
        registeredTemplateHash = template.templateHash;
        return `0x${'02'.repeat(32)}`;
      },
    } as never,
    async () => ({ templateHash }) as never,
  );

  const templateReady = await (service as unknown as {
    ensureTemplateRegistered(invite: BetInvite, fundingAttempt: RelayerAttempt): Promise<boolean>;
  }).ensureTemplateRegistered(invite, fundingAttempt);

  assert.equal(templateReady, false);
  assert.equal(registeredTemplateHash, templateHash);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].action, 'registerTemplate');
  assert.equal(attempts[0].status, 'submitted');
  assert.equal(attempts[0].transactionHash, `0x${'02'.repeat(32)}`);
});

test('relayer enqueues funding without submitting the transaction inline', async () => {
  const escrowAddress = '0x0000000000000000000000000000000000001002' as Address;
  const templateHash = `0x${'11'.repeat(32)}` as Hex;
  const conditionId = `0x${'22'.repeat(32)}` as Hex;
  const offerHash = `0x${'33'.repeat(32)}` as Hex;
  const expiresAt = new Date('2026-07-01T00:00:00.000Z');
  const invite: BetInvite = {
    id: 'invite-queue',
    makerUserId: 'maker-user',
    takerUserId: 'taker-user',
    recipientEmail: null,
    templateHash,
    conditionId,
    makerAddress: maker.address,
    takerAddress: taker.address,
    makerOutcomeIndex: 0,
    takerOutcomeIndex: 1,
    stake: '50000000000000000000',
    loserFee: '3000000000000000000',
    offerNonce: '1',
    acceptanceNonce: '2',
    offerHash,
    offerPayload: {},
    offerSignature: null,
    makerPermit: {
      value: '53000000000000000000',
      nonce: '0',
      deadline: '9999999999',
      v: 27,
      r: `0x${'55'.repeat(32)}` as Hex,
      s: `0x${'66'.repeat(32)}` as Hex,
    },
    makerAuthorizedAt: new Date(),
    acceptancePayload: {},
    acceptanceSignature: null,
    takerPermit: {
      value: '53000000000000000000',
      nonce: '0',
      deadline: '9999999999',
      v: 27,
      r: `0x${'77'.repeat(32)}` as Hex,
      s: `0x${'88'.repeat(32)}` as Hex,
    },
    takerAuthorizedAt: new Date(),
    status: 'accepted',
    betId: null,
    deploymentKey: null,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const domain = {
    name: 'DuellyBetEscrowBRL1',
    version: '1',
    chainId: 137,
    verifyingContract: escrowAddress,
  } as const;
  invite.offerSignature = await maker.signTypedData({
    domain,
    types: betOfferTypes,
    primaryType: 'BetOffer',
    message: inviteToOffer(invite),
  });
  invite.acceptanceSignature = await taker.signTypedData({
    domain,
    types: betAcceptanceTypes,
    primaryType: 'BetAcceptance',
    message: inviteToAcceptance(invite),
  });

  let savedInvite: BetInvite | undefined;
  let savedAttempt: RelayerAttempt | undefined;
  let submittedInline = false;
  const service = new RelayerService(
    {
      findInvite: async () => invite,
      saveInvite: async (next: BetInvite) => {
        savedInvite = next;
        return next;
      },
      findLatestRelayerAttemptForInviteAction: async () => undefined,
      saveRelayerAttempt: async (attempt: RelayerAttempt) => {
        savedAttempt = attempt;
        return attempt;
      },
    } as never,
    {
      deploymentKey: () => 'test-deployment',
      domain: () => domain,
      requireWalletClient: () => ({
        account: '0x0000000000000000000000000000000000001004' as Address,
        walletClient: {
          writeContract: async () => {
            submittedInline = true;
            return `0x${'99'.repeat(32)}` as Hex;
          },
        },
      }),
    } as never,
  );

  const result = await service.fund({ inviteId: invite.id });

  assert.equal(result.status, 'submitted');
  assert.equal(result.transactionHash, null);
  assert.equal(result.betId, null);
  assert.equal(savedInvite?.status, 'funding_submitted');
  assert.equal(savedInvite?.deploymentKey, 'test-deployment');
  assert.equal(savedAttempt?.action, 'acceptBetWithPermits');
  assert.equal(savedAttempt?.deploymentKey, 'test-deployment');
  assert.equal(submittedInline, false);
});

test('relayer resumes template registration once its receipt lands', async () => {
  const attempts: RelayerAttempt[] = [];
  const existingAttempt = {
    id: 'attempt-template',
    requestId: 'relayer-test',
    deploymentKey: 'test-deployment',
    inviteId: 'invite-test',
    action: 'registerTemplate',
    status: 'submitted',
    transactionHash: `0x${'02'.repeat(32)}` as Hex,
    betId: null,
    error: null,
    payload: {},
    createdAt: new Date(),
  } satisfies RelayerAttempt;
  const service = new RelayerService(
    {
      findLatestRelayerAttemptForInviteAction: async () => existingAttempt,
      saveRelayerAttempt: async (attempt: RelayerAttempt) => {
        attempts.push(attempt);
      return attempt;
      },
    } as never,
    {
      readTemplate: async () => ({ registered: false, active: false }),
      receipt: async () => ({ status: 'success', blockNumber: 1n }),
    } as never,
  );

  const templateReady = await (service as unknown as {
    ensureTemplateRegistered(invite: BetInvite, fundingAttempt: RelayerAttempt): Promise<boolean>;
  }).ensureTemplateRegistered({ id: 'invite-test', templateHash: `0x${'01'.repeat(32)}` as Hex } as BetInvite, {
    id: 'attempt-funding',
    requestId: 'relayer-test',
    deploymentKey: 'test-deployment',
    inviteId: 'invite-test',
    action: 'acceptBetWithPermits',
    status: 'submitted',
    transactionHash: null,
    betId: null,
    error: null,
    payload: {},
    createdAt: new Date(),
  });

  assert.equal(templateReady, true);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].action, 'registerTemplate');
  assert.equal(attempts[0].status, 'succeeded');
});

test('relayer fails expired queued funding without submitting a transaction', async () => {
  let wroteContract = false;
  let savedAttempt: RelayerAttempt | undefined;
  let savedInvite: BetInvite | undefined;
  const invite = {
    id: 'invite-expired',
    status: 'funding_submitted',
    expiresAt: new Date('2026-05-21T00:00:00.000Z'),
    takerAddress: taker.address,
    takerOutcomeIndex: 1,
    acceptancePayload: {},
  } as BetInvite;
  const service = new RelayerService(
    {
      findInvite: async () => invite,
      saveRelayerAttempt: async (attempt: RelayerAttempt) => {
        savedAttempt = attempt;
        return attempt;
      },
      saveInvite: async (next: BetInvite) => {
        savedInvite = next;
        return next;
      },
    } as never,
    {
      requireWalletClient: () => ({
        account: '0x0000000000000000000000000000000000001004' as Address,
        walletClient: {
          writeContract: async () => {
            wroteContract = true;
            return `0x${'99'.repeat(32)}` as Hex;
          },
        },
      }),
    } as never,
  );

  const result = await service.processFundingAttempt({
    id: 'attempt-expired',
    requestId: 'relayer-expired',
    deploymentKey: 'test-deployment',
    inviteId: invite.id,
    action: 'acceptBetWithPermits',
    status: 'processing',
    transactionHash: null,
    betId: null,
    error: null,
    payload: { inviteId: invite.id },
    createdAt: new Date(),
    lockedAt: new Date(),
  });

  assert.equal(result.status, 'failed');
  assert.equal(savedAttempt?.error, 'INVITE_EXPIRED');
  assert.equal(savedAttempt?.lockedAt, null);
  assert.equal(savedInvite?.status, 'accepted');
  assert.equal(wroteContract, false);
});

test('relayer persists funded bet from receipt before the indexer catches up', async () => {
  const escrowAddress = '0x0000000000000000000000000000000000001002' as Address;
  const tx = `0x${'44'.repeat(32)}` as Hex;
  const templateHash = `0x${'11'.repeat(32)}` as Hex;
  const conditionId = `0x${'22'.repeat(32)}` as Hex;
  const offerHash = `0x${'33'.repeat(32)}` as Hex;
  const expiresAt = new Date('2026-07-01T00:00:00.000Z');
  const invite: BetInvite = {
    id: 'invite-staging',
    makerUserId: 'maker-user',
    takerUserId: 'taker-user',
    recipientEmail: null,
    templateHash,
    conditionId,
    makerAddress: maker.address,
    takerAddress: taker.address,
    makerOutcomeIndex: 0,
    takerOutcomeIndex: 1,
    stake: '50000000000000000000',
    loserFee: '3000000000000000000',
    offerNonce: '1',
    acceptanceNonce: '2',
    offerHash,
    offerPayload: {},
    offerSignature: null,
    makerPermit: {
      value: '53000000000000000000',
      nonce: '0',
      deadline: '9999999999',
      v: 27,
      r: `0x${'55'.repeat(32)}` as Hex,
      s: `0x${'66'.repeat(32)}` as Hex,
    },
    makerAuthorizedAt: new Date(),
    acceptancePayload: {},
    acceptanceSignature: null,
    takerPermit: {
      value: '53000000000000000000',
      nonce: '0',
      deadline: '9999999999',
      v: 27,
      r: `0x${'77'.repeat(32)}` as Hex,
      s: `0x${'88'.repeat(32)}` as Hex,
    },
    takerAuthorizedAt: new Date(),
    status: 'funding_submitted',
    betId: null,
    deploymentKey: 'test-deployment',
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const domain = {
    name: 'DuellyBetEscrowBRL1',
    version: '1',
    chainId: 137,
    verifyingContract: escrowAddress,
  } as const;
  invite.offerSignature = await maker.signTypedData({
    domain,
    types: betOfferTypes,
    primaryType: 'BetOffer',
    message: inviteToOffer(invite),
  });
  invite.acceptanceSignature = await taker.signTypedData({
    domain,
    types: betAcceptanceTypes,
    primaryType: 'BetAcceptance',
    message: inviteToAcceptance(invite),
  });

  const fundedLog = {
    topics: [
      toEventSelector('event BetFunded(uint256 indexed betId,bytes32 indexed templateHash,bytes32 indexed conditionId,address playerA,address playerB,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee)'),
      pad(numberToHex(1n), { size: 32 }),
      templateHash,
      conditionId,
    ] as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      parseAbiParameters('address playerA,address playerB,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee'),
      [maker.address, taker.address, 0, 1, 50_000_000_000_000_000_000n, 3_000_000_000_000_000_000n],
    ),
  };
  let savedInvite: BetInvite | undefined;
  let savedIndexedBet: IndexedBet | undefined;
  const service = new RelayerService(
    {
      findInvite: async () => invite,
      saveInvite: async (next: BetInvite) => {
        savedInvite = next;
        return next;
      },
      saveIndexedBet: async (bet: IndexedBet) => {
        savedIndexedBet = bet;
        return bet;
      },
      saveRelayerAttempt: async (attempt: RelayerAttempt) => attempt,
    } as never,
    {
      deploymentKey: () => 'test-deployment',
      domain: () => domain,
      readTemplate: async () => ({ registered: true, active: true }),
      requireAddresses: () => ({
        brl1Address: '0x0000000000000000000000000000000000001001' as Address,
        escrowAddress,
        polymarketCtfAddress: '0x0000000000000000000000000000000000001003' as Address,
      }),
      receipt: async () => ({
        status: 'success',
        blockNumber: 123n,
        logs: [{ address: escrowAddress, data: fundedLog.data, topics: fundedLog.topics }],
      }),
    } as never,
  );

  const result = await service.processFundingAttempt({
    id: 'attempt-funding',
    requestId: 'relayer-funding',
    deploymentKey: 'test-deployment',
    inviteId: invite.id,
    action: 'acceptBetWithPermits',
    status: 'submitted',
    transactionHash: tx,
    betId: null,
    error: null,
    payload: { inviteId: invite.id },
    createdAt: new Date(),
  });

  assert.equal(result.betId, '1');
  assert.equal(result.status, 'succeeded');
  assert.equal(savedInvite?.status, 'funded');
  assert.equal(savedInvite?.betId, '1');
  assert.equal(savedIndexedBet?.betId, '1');
  assert.equal(savedIndexedBet?.inviteId, invite.id);
  assert.equal(savedIndexedBet?.status, 'Funded');
  assert.equal(savedIndexedBet?.sourceBlockNumber, '123');
  assert.equal(savedIndexedBet?.sourceTransactionHash, tx);
});

test('bets controller derives explorer receipt links from existing records', async () => {
  const escrowAddress = '0x0000000000000000000000000000000000001002' as Address;
  const fundingTx = `0x${'21'.repeat(32)}` as Hex;
  const settlementTx = `0x${'22'.repeat(32)}` as Hex;
  const bet = receiptBet({
    status: 'Resolved',
    sourceTransactionHash: settlementTx,
    sourceBlockNumber: '101',
  });
  const controller = new BetsController({
    config: {
      chain: {
        explorerBaseUrl: 'https://polygonscan.com',
        escrowAddress,
      },
    },
    chain: {
      deploymentKey: () => bet.deploymentKey,
    },
    repository: {
      findIndexedBet: async () => bet,
      findLatestRelayerAttemptForInviteAction: async () => ({
        id: 'attempt-funding',
        requestId: 'relayer-funding',
        deploymentKey: bet.deploymentKey,
        inviteId: bet.inviteId,
        action: 'acceptBetWithPermits',
        status: 'succeeded',
        transactionHash: fundingTx,
        betId: bet.betId,
        error: null,
        payload: {},
        createdAt: new Date(),
      } satisfies RelayerAttempt),
      findIndexedEventByTransactionHash: async () => ({
        id: 'event-funding',
        deploymentKey: bet.deploymentKey,
        eventName: 'BetFunded',
        transactionHash: fundingTx,
        logIndex: 0,
        blockNumber: '100',
        args: {},
        createdAt: new Date(),
      }),
    },
  } as never);

  const result = await controller.get({ params: { betId: bet.betId } } as never, replyStub());
  const publicBet = (result as { bet: { receipts: Record<string, { url?: string; blockNumber?: string | null; address?: string }> } }).bet;

  assert.equal(publicBet.receipts.funding.url, `https://polygonscan.com/tx/${fundingTx}`);
  assert.equal(publicBet.receipts.funding.blockNumber, '100');
  assert.equal(publicBet.receipts.settlement.url, `https://polygonscan.com/tx/${settlementTx}`);
  assert.equal(publicBet.receipts.settlement.blockNumber, '101');
  assert.equal(publicBet.receipts.contract.url, `https://polygonscan.com/address/${escrowAddress}`);
  assert.equal(publicBet.receipts.contract.address, escrowAddress);
});

test('bets controller suppresses receipt links when no explorer is configured', async () => {
  const bet = receiptBet({});
  const controller = new BetsController({
    config: {
      chain: {
        explorerBaseUrl: undefined,
        escrowAddress: '0x0000000000000000000000000000000000001002' as Address,
      },
    },
    chain: {
      deploymentKey: () => bet.deploymentKey,
    },
    repository: {
      findIndexedBet: async () => bet,
    },
  } as never);

  const result = await controller.get({ params: { betId: bet.betId } } as never, replyStub());
  const receipts = (result as { bet: { receipts: Record<string, unknown> } }).bet.receipts;

  assert.deepEqual(receipts, { funding: null, settlement: null, contract: null });
});

function testConfig(options: { inviteTtlSeconds?: number } = {}) {
  return {
    ...loadAppConfig(),
    nodeEnv: 'test',
    database: { enabled: false, port: 5432 },
    auth: {
      sessionTtlSeconds: 3600,
      walletChallengeTtlSeconds: 600,
      mockAuthEnabled: true,
    },
    invites: {
      ttlSeconds: options.inviteTtlSeconds ?? 3600,
    },
    resolutionWorker: {
      enabled: false,
      intervalMs: 60_000,
      batchSize: 10,
      pendingRetrySeconds: 900,
    },
    relayerWorker: {
      enabled: false,
      intervalMs: 3000,
      batchSize: 5,
      processingTimeoutMs: 120000,
    },
    polymarketResolutionMirror: {
      enabled: false,
      sourceRpcUrl: undefined,
      oracleAddress: undefined,
      oracleAddresses: [],
      negRiskOracleAddress: undefined,
      outcomeSlotCount: 2,
      allowNonLocalForkRpc: false,
    },
    chain: {
      enabled: false,
      rpcUrl: undefined,
      chainId: 137,
      brl1Address: '0x0000000000000000000000000000000000001001' as Address,
      escrowAddress: '0x0000000000000000000000000000000000001002' as Address,
      polymarketCtfAddress: '0x0000000000000000000000000000000000001003' as Address,
      deploymentBlock: 0n,
      relayerPrivateKey: undefined,
      minLoserFeeWei: 0n,
      gasEstimateWei: 1_000_000_000_000_000_000n,
      gasMultiplier: 3,
    },
  };
}

function receiptBet(overrides: Partial<IndexedBet>): IndexedBet {
  return {
    deploymentKey: 'test-deployment',
    betId: '1',
    inviteId: 'invite-receipts',
    templateHash: `0x${'11'.repeat(32)}` as Hex,
    conditionId: `0x${'22'.repeat(32)}` as Hex,
    playerA: maker.address,
    playerB: taker.address,
    playerAOutcomeIndex: 0,
    playerBOutcomeIndex: 1,
    stake: '50000000000000000000',
    loserFee: '3000000000000000000',
    status: 'Funded',
    winner: null,
    winnerPayout: null,
    treasuryPayout: null,
    sourceTransactionHash: `0x${'20'.repeat(32)}` as Hex,
    sourceBlockNumber: '99',
    updatedAt: new Date('2026-05-22T00:00:00.000Z'),
    ...overrides,
  };
}

function replyStub() {
  return {
    code() {
      return this;
    },
  } as never;
}

test('Invite creation returns CONDITION_RESOLVED before building payloads for resolved templates', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => rpcPayoutDenominatorResponse(input, init, 1n);
  const app = await createApp({ config: resolvedFixtureConfig() });
  test.after(async () => {
    await app.close();
    globalThis.fetch = previousFetch;
  });

  const registered = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'maker@example.test', password: 'password-123' },
  });
  assert.equal(registered.statusCode, 200);

  const invite = await app.inject({
    method: 'POST',
    url: '/invites',
    headers: { authorization: `Bearer ${registered.json().token}` },
    payload: {
      templateId: 'fixture-f1-sprint-winner',
      stake: '100000000000000000000',
      loserFee: '3000000000000000000',
      makerOutcomeIndex: 0,
    },
  });

  assert.equal(invite.statusCode, 410);
  assert.equal(invite.json().code, 'CONDITION_RESOLVED');
  assert.equal(JSON.stringify(invite.json()).includes('offerPayload'), false);
});

test('Auth protects endpoints and supports local email/password sessions', async () => {
  const app = await createApp({ config: testConfig() });
  test.after(async () => app.close());

  const unauthenticated = await app.inject({ method: 'GET', url: '/auth/me' });
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.json().code, 'UNAUTHENTICATED');

  const registered = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'Maker@example.test', password: 'password-123' },
  });
  assert.equal(registered.statusCode, 200);
  assert.match(registered.json().token, /^[A-Za-z0-9_-]+$/);
  assert.equal(registered.json().user.displayIdentifier, 'maker@example.test');

  const me = await app.inject({
    method: 'GET',
    url: '/auth/me',
    headers: { authorization: `Bearer ${registered.json().token}` },
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.displayIdentifier, 'maker@example.test');
});

test('Wallet challenge links a private wallet without exposing key material', async () => {
  const app = await createApp({ config: testConfig() });
  test.after(async () => app.close());

  const registered = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'wallet@example.test', password: 'password-123' },
  });
  const token = registered.json().token;
  const challenge = await app.inject({
    method: 'POST',
    url: '/wallets/challenges',
    headers: { authorization: `Bearer ${token}` },
    payload: { address: maker.address },
  });
  assert.equal(challenge.statusCode, 200);
  assert.equal(challenge.json().address, maker.address);

  const signature = await maker.signMessage({ message: challenge.json().message });
  const linked = await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${token}` },
    payload: { challengeId: challenge.json().id, signature },
  });
  assert.equal(linked.statusCode, 200);
  assert.equal(linked.json().wallet.address, maker.address);
  assert.equal(linked.json().wallet.verificationStatus, 'verified');
  assert.equal(JSON.stringify(linked.json()).includes('private'), false);

  const unlinked = await app.inject({
    method: 'DELETE',
    url: '/wallets/me',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(unlinked.statusCode, 200);
  assert.equal(unlinked.json().wallet.verificationStatus, 'inactive');

  const afterUnlink = await app.inject({
    method: 'GET',
    url: '/wallets/me',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(afterUnlink.statusCode, 404);
  assert.equal(afterUnlink.json().code, 'WALLET_NOT_LINKED');

  const relinkChallenge = await app.inject({
    method: 'POST',
    url: '/wallets/challenges',
    headers: { authorization: `Bearer ${token}` },
    payload: { address: maker.address },
  });
  const relinked = await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${token}` },
    payload: { challengeId: relinkChallenge.json().id, signature: await maker.signMessage({ message: relinkChallenge.json().message }) },
  });
  assert.equal(relinked.statusCode, 200);
  assert.equal(relinked.json().wallet.verificationStatus, 'verified');

  const replay = await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${token}` },
    payload: { challengeId: challenge.json().id, signature },
  });
  assert.equal(replay.statusCode, 400);
  assert.equal(replay.json().code, 'WALLET_CHALLENGE_REPLAYED');
});

test('Fee quote, template detail, invite, and acceptance payloads are exposed', async () => {
  const originalDateNow = Date.now;
  Date.now = () => new Date('2026-05-20T00:00:00.000Z').getTime();
  const app = await createApp({ config: testConfig({ inviteTtlSeconds: 10 * 365 * 24 * 60 * 60 }) });
  test.after(async () => {
    Date.now = originalDateNow;
    await app.close();
  });

  const makerLogin = await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'maker@example.test', password: 'password-123' } });
  const takerLogin = await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'taker@example.test', password: 'password-123' } });

  const makerChallenge = await app.inject({
    method: 'POST',
    url: '/wallets/challenges',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: { address: maker.address },
  });
  await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: { challengeId: makerChallenge.json().id, signature: await maker.signMessage({ message: makerChallenge.json().message }) },
  });

  const takerChallenge = await app.inject({
    method: 'POST',
    url: '/wallets/challenges',
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { address: taker.address },
  });
  await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { challengeId: takerChallenge.json().id, signature: await taker.signMessage({ message: takerChallenge.json().message }) },
  });

  const detail = await app.inject({ method: 'GET', url: '/templates/fixture-f1-sprint-winner?mode=fixture' });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().template.templateId, 'fixture-f1-sprint-winner');

  const quote = await app.inject({
    method: 'POST',
    url: '/fees/loser-fee',
    payload: { stake: '100000000000000000000', loserFeeBps: 250 },
  });
  assert.equal(quote.statusCode, 200);
  assert.equal(quote.json().selectedLoserFeeRaw, '3000000000000000000');

  const mismatchedInvite = await app.inject({
    method: 'POST',
    url: '/invites',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      templateId: 'fixture-f1-sprint-winner',
      stake: '100000000000000000000',
      loserFee: '1',
      makerOutcomeIndex: 0,
    },
  });
  assert.equal(mismatchedInvite.statusCode, 400);
  assert.equal(mismatchedInvite.json().code, 'LOSER_FEE_MISMATCH');

  const invite = await app.inject({
    method: 'POST',
    url: '/invites',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      templateId: 'fixture-f1-sprint-winner',
      stake: '100000000000000000000',
      loserFee: quote.json().selectedLoserFeeRaw,
      makerOutcomeIndex: 0,
    },
  });
  assert.equal(invite.statusCode, 200);
  assert.equal(invite.json().invite.status, 'draft');
  assert.equal(invite.json().shareable, false);
  assert.equal(invite.json().offerPayload.primaryType, 'BetOffer');
  assert.equal(invite.json().offerPayload.domain.chainId, 137);
  assert.equal(invite.json().offerPayload.message.deadline, String(detail.json().template.bettingCloseAt));
  assert.equal(invite.json().invite.expiresAt, new Date(detail.json().template.bettingCloseAt * 1000).toISOString());
  assert.equal(invite.json().makerPermitPayload.primaryType, 'Permit');

  const draftPublicRead = await app.inject({ method: 'GET', url: `/invites/${invite.json().invite.id}` });
  assert.equal(draftPublicRead.statusCode, 404);

  const draftToCancel = await app.inject({
    method: 'POST',
    url: '/invites',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      templateId: 'fixture-f1-sprint-winner',
      stake: '100000000000000000000',
      loserFee: quote.json().selectedLoserFeeRaw,
      makerOutcomeIndex: 0,
    },
  });
  assert.equal(draftToCancel.statusCode, 200);
  const cancelledDraft = await app.inject({
    method: 'DELETE',
    url: `/invites/${draftToCancel.json().invite.id}`,
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
  });
  assert.equal(cancelledDraft.statusCode, 200);
  assert.equal(cancelledDraft.json().invite.status, 'cancelled');
  const cancelledPublicRead = await app.inject({ method: 'GET', url: `/invites/${draftToCancel.json().invite.id}` });
  assert.equal(cancelledPublicRead.statusCode, 404);

  const invalidMakerAuthorization = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/maker-authorizations`,
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      offerSignature: await taker.signTypedData(typedData(invite.json().offerPayload)),
      makerPermit: permitData(await maker.signTypedData(typedData(invite.json().makerPermitPayload)), invite.json().makerPermitPayload),
    },
  });
  assert.equal(invalidMakerAuthorization.statusCode, 400);
  assert.equal(invalidMakerAuthorization.json().code, 'INVALID_OFFER_SIGNATURE');

  const makerAuthorization = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/maker-authorizations`,
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      offerSignature: await maker.signTypedData(typedData(invite.json().offerPayload)),
      makerPermit: permitData(await maker.signTypedData(typedData(invite.json().makerPermitPayload)), invite.json().makerPermitPayload),
    },
  });
  assert.equal(makerAuthorization.statusCode, 200);
  assert.equal(makerAuthorization.json().invite.status, 'created');
  assert.equal(makerAuthorization.json().shareable, true);

  const publicRead = await app.inject({ method: 'GET', url: `/invites/${invite.json().invite.id}` });
  assert.equal(publicRead.statusCode, 200);
  assert.equal(publicRead.json().template.templateId, 'fixture-f1-sprint-winner');

  const accepted = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/accept`,
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { takerOutcomeIndex: 1 },
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().acceptancePayload.primaryType, 'BetAcceptance');
  assert.equal(accepted.json().takerPermitPayload.primaryType, 'Permit');
  assert.equal(accepted.json().acceptancePayload.message.deadline, String(detail.json().template.bettingCloseAt));
  assert.equal(accepted.json().invite.status, 'accepted');

  const resumedAcceptance = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/accept`,
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { takerOutcomeIndex: 1 },
  });
  assert.equal(resumedAcceptance.statusCode, 200);
  assert.equal(resumedAcceptance.json().invite.status, 'accepted');
  assert.equal(resumedAcceptance.json().acceptancePayload.message.nonce, accepted.json().acceptancePayload.message.nonce);

  const missingTakerAuthorization = await app.inject({
    method: 'POST',
    url: '/relayer/fund',
    payload: { inviteId: invite.json().invite.id },
  });
  assert.equal(missingTakerAuthorization.statusCode, 400);
  assert.equal(missingTakerAuthorization.json().code, 'MISSING_TAKER_AUTHORIZATION');

  const missingRelayerKey = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/taker-authorizations`,
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: {
      acceptanceSignature: await taker.signTypedData(typedData(accepted.json().acceptancePayload)),
      takerPermit: permitData(await taker.signTypedData(typedData(accepted.json().takerPermitPayload)), accepted.json().takerPermitPayload),
    },
  });
  assert.equal(missingRelayerKey.statusCode, 503);
  assert.equal(missingRelayerKey.json().code, 'RELAYER_PRIVATE_KEY_NOT_CONFIGURED');

  const makerBets = await app.inject({
    method: 'GET',
    url: '/me/bets',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
  });
  assert.equal(makerBets.statusCode, 200);
  assert.equal(makerBets.json().bets[0].role, 'maker');
  assert.equal(makerBets.json().bets[0].invite.id, invite.json().invite.id);
  assert.equal(makerBets.json().bets[0].template.templateId, 'fixture-f1-sprint-winner');
});

test('Email-restricted invites appear in the recipient inbox and block other accounts', async () => {
  const originalDateNow = Date.now;
  Date.now = () => new Date('2026-05-20T00:00:00.000Z').getTime();
  const app = await createApp({ config: testConfig({ inviteTtlSeconds: 10 * 365 * 24 * 60 * 60 }) });
  test.after(async () => {
    Date.now = originalDateNow;
    await app.close();
  });

  const makerLogin = await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'maker@example.test', password: 'password-123' } });
  const takerLogin = await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'taker@example.test', password: 'password-123' } });
  const wrongLogin = await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'wrong@example.test', password: 'password-123' } });

  const makerChallenge = await app.inject({
    method: 'POST',
    url: '/wallets/challenges',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: { address: maker.address },
  });
  await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: { challengeId: makerChallenge.json().id, signature: await maker.signMessage({ message: makerChallenge.json().message }) },
  });

  const takerChallenge = await app.inject({
    method: 'POST',
    url: '/wallets/challenges',
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { address: taker.address },
  });
  await app.inject({
    method: 'POST',
    url: '/wallets/link',
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { challengeId: takerChallenge.json().id, signature: await taker.signMessage({ message: takerChallenge.json().message }) },
  });

  const quote = await app.inject({
    method: 'POST',
    url: '/fees/loser-fee',
    payload: { stake: '100000000000000000000', loserFeeBps: 250 },
  });
  const invite = await app.inject({
    method: 'POST',
    url: '/invites',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      templateId: 'fixture-f1-sprint-winner',
      stake: '100000000000000000000',
      loserFee: quote.json().selectedLoserFeeRaw,
      makerOutcomeIndex: 0,
      recipientEmail: ' TAKER@example.test ',
    },
  });
  assert.equal(invite.statusCode, 200);
  assert.equal(invite.json().invite.isRecipientRestricted, true);
  assert.equal(invite.json().invite.recipientEmailHint, 't***@example.test');

  const makerAuthorization = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/maker-authorizations`,
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
    payload: {
      offerSignature: await maker.signTypedData(typedData(invite.json().offerPayload)),
      makerPermit: permitData(await maker.signTypedData(typedData(invite.json().makerPermitPayload)), invite.json().makerPermitPayload),
    },
  });
  assert.equal(makerAuthorization.statusCode, 200);

  const takerPending = await app.inject({
    method: 'GET',
    url: '/me/invites/pending',
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
  });
  assert.equal(takerPending.statusCode, 200);
  assert.equal(takerPending.json().invites.length, 1);
  assert.equal(takerPending.json().invites[0].invite.id, invite.json().invite.id);
  assert.equal(takerPending.json().invites[0].invite.recipientAccess, 'allowed');

  const makerPending = await app.inject({
    method: 'GET',
    url: '/me/invites/pending',
    headers: { authorization: `Bearer ${makerLogin.json().token}` },
  });
  assert.equal(makerPending.json().invites.length, 0);

  const wrongPending = await app.inject({
    method: 'GET',
    url: '/me/invites/pending',
    headers: { authorization: `Bearer ${wrongLogin.json().token}` },
  });
  assert.equal(wrongPending.json().invites.length, 0);

  const publicRead = await app.inject({ method: 'GET', url: `/invites/${invite.json().invite.id}` });
  assert.equal(publicRead.statusCode, 200);
  assert.equal(publicRead.json().invite.recipientAccess, 'unknown');
  assert.equal(JSON.stringify(publicRead.json()).includes('taker@example.test'), false);

  const wrongRead = await app.inject({
    method: 'GET',
    url: `/invites/${invite.json().invite.id}`,
    headers: { authorization: `Bearer ${wrongLogin.json().token}` },
  });
  assert.equal(wrongRead.json().invite.recipientAccess, 'blocked');

  const wrongAccept = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/accept`,
    headers: { authorization: `Bearer ${wrongLogin.json().token}` },
    payload: { takerOutcomeIndex: 1 },
  });
  assert.equal(wrongAccept.statusCode, 403);
  assert.equal(wrongAccept.json().code, 'INVITE_RECIPIENT_MISMATCH');

  const accepted = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/accept`,
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { takerOutcomeIndex: 1 },
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().invite.status, 'accepted');

  const takerPendingAfterAccept = await app.inject({
    method: 'GET',
    url: '/me/invites/pending',
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
  });
  assert.equal(takerPendingAfterAccept.json().invites.length, 0);
});

function typedData(payload: { domain: unknown; types: unknown; primaryType: string; message: Record<string, unknown> }) {
  const message = { ...payload.message };
  for (const key of ['stake', 'loserFee', 'nonce', 'deadline', 'value']) {
    if (message[key] !== undefined) message[key] = BigInt(String(message[key]));
  }
  return {
    domain: payload.domain,
    types: payload.types,
    primaryType: payload.primaryType,
    message,
  } as never;
}

function permitData(signature: `0x${string}`, payload: { message: Record<string, unknown> }) {
  const parsed = parseSignature(signature);
  return {
    value: String(payload.message.value),
    nonce: String(payload.message.nonce),
    deadline: String(payload.message.deadline),
    v: Number(parsed.v),
    r: parsed.r,
    s: parsed.s,
  };
}

function resolvedFixtureConfig() {
  const config = testConfig();
  return {
    ...config,
    polymarketResolutionMirror: {
      ...config.polymarketResolutionMirror,
      sourceRpcUrl: 'https://source-rpc.example',
    },
    chain: {
      ...config.chain,
      enabled: true,
      rpcUrl: 'https://fork-rpc.example',
    },
  };
}

function rpcPayoutDenominatorResponse(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  denominator: bigint,
): Response {
  const body = requestBody(input, init);
  const payload = JSON.parse(body) as { id?: number };
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id: payload.id ?? 1,
    result: `0x${denominator.toString(16).padStart(64, '0')}`,
  }), { status: 200 });
}

function requestBody(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]): string {
  if (typeof init?.body === 'string') return init.body;
  if (input instanceof Request && typeof input.body === 'string') return input.body;
  return '{}';
}
