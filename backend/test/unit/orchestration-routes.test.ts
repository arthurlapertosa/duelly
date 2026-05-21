import test from 'node:test';
import assert from 'node:assert/strict';
import type { Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createApp } from '../../src/app.js';
import { loadAppConfig } from '../../src/config/env.js';

const maker = privateKeyToAccount('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
const taker = privateKeyToAccount('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

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
  assert.equal(invite.json().offerPayload.primaryType, 'BetOffer');
  assert.equal(invite.json().offerPayload.domain.chainId, 137);
  assert.equal(invite.json().offerPayload.message.deadline, String(detail.json().template.bettingCloseAt));
  assert.equal(invite.json().invite.expiresAt, new Date(detail.json().template.bettingCloseAt * 1000).toISOString());

  const accepted = await app.inject({
    method: 'POST',
    url: `/invites/${invite.json().invite.id}/accept`,
    headers: { authorization: `Bearer ${takerLogin.json().token}` },
    payload: { takerOutcomeIndex: 1 },
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().acceptancePayload.primaryType, 'BetAcceptance');
  assert.equal(accepted.json().acceptancePayload.message.deadline, String(detail.json().template.bettingCloseAt));
  assert.equal(accepted.json().invite.status, 'accepted');
});
