import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSignature, type Address } from 'viem';
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
