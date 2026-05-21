import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiError } from '../src/lib/api.ts';
import { errorCodeFrom, errorKeyFor, errorMessage, knownErrorCodes } from '../src/lib/errors.ts';
import { brlToRaw, formatBRL, potentialPayoutRaw } from '../src/lib/format.ts';
import { defaultLocale, locales, missingTranslationKeys, translate } from '../src/lib/i18n.ts';
import { deriveBetStatus, inviteHasExpired, mapPendingInvite } from '../src/lib/mappers.ts';
import { metaMaskTypedPayload } from '../src/lib/wallet.ts';
import type { BetSummaryView } from '../src/lib/types.ts';

test('locales are complete and provide both default languages', () => {
  assert.deepEqual(missingTranslationKeys(), []);
  assert.equal(translate('pt-BR', 'auth.enter'), 'Entrar');
  assert.equal(translate('en-US', 'auth.enter'), 'Sign in');
  assert.equal(defaultLocale, 'en-US');
  assert.deepEqual(locales, ['en-US', 'pt-BR']);
});

test('onboarding defaults to sign in with empty credentials', () => {
  const source = readFileSync(resolve('src/App.tsx'), 'utf8');
  assert.match(source, /useState<'login' \| 'register'>\('login'\)/);
  assert.match(source, /\(\['login', 'register'\] as const\)/);
  assert.equal(source.includes("useState('maker@duelly.test')"), false);
  assert.equal(source.includes("useState('password-123')"), false);
});

test('known API and wallet errors have localized messages and fallbacks', () => {
  for (const code of knownErrorCodes) {
    assert.notEqual(translate('en-US', `error.${code}`), `error.${code}`, code);
    assert.notEqual(translate('pt-BR', `error.${code}`), `error.${code}`, code);
  }
  assert.equal(errorMessage('en-US', new ApiError('WALLET_ALREADY_LINKED')), 'This wallet is already connected to another Duelly account.');
  assert.equal(errorMessage('pt-BR', new ApiError('WALLET_ALREADY_LINKED')), 'Esta carteira já está conectada a outra conta Duelly.');
  assert.equal(errorKeyFor('MISSING_ADDRESS'), 'error.MISSING_FIELD');
  assert.equal(errorKeyFor('INVALID_ADDRESS'), 'error.INVALID_FIELD');
  assert.equal(errorCodeFrom(new Error('User rejected the request')), 'USER_REJECTED');
  assert.equal(errorCodeFrom({ code: 4100, message: 'The requested account and/or method has not been authorized by the user.' }), 'WALLET_ACCOUNT_NOT_AUTHORIZED');
  assert.match(errorMessage('en-US', new Error('WALLET_ACCOUNT_MISMATCH')), /Switch to the linked wallet/);
  assert.equal(errorCodeFrom(new Error('Relayer private key is not configured')), 'RELAYER_PRIVATE_KEY_NOT_CONFIGURED');
  assert.match(errorMessage('en-US', new ApiError('RELAYER_PRIVATE_KEY_NOT_CONFIGURED')), /Set RELAYER_PRIVATE_KEY/);
  assert.equal(errorMessage('en-US', new Error('SOMETHING_NEW')), translate('en-US', 'error.UNKNOWN_ERROR'));
});

test('HTTP requests only send JSON content type when a body is present', () => {
  const source = readFileSync(resolve('src/lib/api.ts'), 'utf8');
  assert.match(source, /options\.body !== undefined && options\.body !== null/);
  assert.match(source, /headers\.set\('content-type', 'application\/json'\)/);
});

test('injected wallet typed data includes the EIP-712 domain type for MetaMask', () => {
  const payload = metaMaskTypedPayload({
    domain: {
      name: 'DuellyBetEscrowBRL1',
      version: '1',
      chainId: 137,
      verifyingContract: '0xBFa43c5A715685Ef5867729E40367CB9eb0434e4',
    },
    types: {
      BetOffer: [
        { name: 'maker', type: 'address' },
        { name: 'stake', type: 'uint256' },
      ],
    },
    primaryType: 'BetOffer',
    message: {
      maker: '0xB4Dd9A1E85153ad142b89f79244e66B44F574236',
      stake: '250000000000000000000',
    },
  });
  assert.deepEqual(payload.types.EIP712Domain, [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ]);
  assert.equal(payload.types.BetOffer.length, 2);
});

test('wallet verification asks the browser wallet to choose an account', () => {
  const walletSource = readFileSync(resolve('src/lib/wallet.ts'), 'utf8');
  const storeSource = readFileSync(resolve('src/store/useAppStore.ts'), 'utf8');
  assert.match(walletSource, /wallet_requestPermissions/);
  assert.match(walletSource, /eth_accounts/);
  assert.match(storeSource, /adapter\.selectAccount\(\)/);
});

test('structured backend and frontend error codes are registered for translation', () => {
  const discovered = discoverStructuredErrorCodes();
  const registered = new Set<string>(knownErrorCodes);
  for (const code of discovered) {
    assert.ok(registered.has(code), code);
  }
});

test('BRL1 raw values format per active locale', () => {
  const raw = brlToRaw(52.5);
  assert.equal(raw, '52500000000000000000');
  assert.equal(formatBRL(raw, 'pt-BR'), 'R$ 52,50');
  assert.equal(formatBRL(raw, 'en-US'), 'R$52.50');
  assert.equal(potentialPayoutRaw(brlToRaw(50), brlToRaw(3)), brlToRaw(103));
});

function discoverStructuredErrorCodes(): string[] {
  const files = [
    ...walk(resolve('..', 'backend', 'src')),
    resolve('src/lib/api.ts'),
    resolve('src/lib/wallet.ts'),
    resolve('src/App.tsx'),
  ];
  const codes = new Set<string>();
  const patterns = [
    /httpError\([^)]*,\s*'([A-Z0-9_]+)'/g,
    /code:\s*'([A-Z0-9_]+)'/g,
    /new ApiError\('([A-Z0-9_]+)'/g,
    /throw new Error\('([A-Z0-9_]+)'/g,
  ];
  for (const file of files.filter((item) => item.endsWith('.ts') || item.endsWith('.tsx'))) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) codes.add(match[1]);
    }
  }
  return [...codes].sort();
}

function walk(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const fullPath = resolve(path, entry);
    return statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];
  });
}

test('invite-only summaries derive non-funded UI statuses', () => {
  const summary = {
    role: 'maker',
    requiredFundingRaw: brlToRaw(53),
    template: null,
    bet: null,
    invite: {
      id: 'invite-1',
      status: 'created',
      isRecipientRestricted: false,
      recipientEmailHint: null,
      recipientAccess: 'open',
      templateHash: `0x${'01'.repeat(32)}`,
      conditionId: `0x${'02'.repeat(32)}`,
      makerAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      takerAddress: null,
      makerOutcomeIndex: 0,
      takerOutcomeIndex: null,
      stakeRaw: brlToRaw(50),
      loserFeeRaw: brlToRaw(3),
      expiresAt: '2026-06-27T10:00:00.000Z',
      betId: null,
    },
  } satisfies BetSummaryView;
  assert.equal(deriveBetStatus(summary), 'InviteCreated');
  assert.equal(deriveBetStatus({ ...summary, invite: { ...summary.invite, status: 'funded', betId: '1' } }), 'Funded');
  assert.equal(deriveBetStatus({ ...summary, invite: { ...summary.invite, status: 'cancelled' } }), 'Expired');
  assert.equal(inviteHasExpired(summary.invite, Date.parse('2026-05-21T18:00:00.000Z')), false);
  const expired = { ...summary, invite: { ...summary.invite, status: 'accepted', expiresAt: '2026-05-21T16:25:15.000Z' } } satisfies BetSummaryView;
  assert.equal(inviteHasExpired(expired.invite, Date.parse('2026-05-21T18:00:00.000Z')), true);
  assert.equal(deriveBetStatus(expired), 'Expired');
});

test('pending invite mapper preserves recipient access metadata', () => {
  const pending = mapPendingInvite({
    requiredFundingRaw: brlToRaw(103),
    template: {
      templateId: 'fixture-f1-sprint-winner',
      templateHash: `0x${'01'.repeat(32)}`,
      conditionId: `0x${'02'.repeat(32)}`,
      sport: 'f1',
      display: { question: 'Will Driver B win?' },
      outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
      outcomeB: { label: 'No', providerOutcomeIndex: 1 },
      bettingCloseAt: 1782554400,
      resolutionDeadline: 1782813600,
      loserFeeBps: 250,
      active: true,
    },
    invite: {
      id: 'invite-1',
      status: 'created',
      isRecipientRestricted: true,
      recipientEmailHint: 't***@example.test',
      recipientAccess: 'allowed',
      templateHash: `0x${'01'.repeat(32)}`,
      conditionId: `0x${'02'.repeat(32)}`,
      makerAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      takerAddress: null,
      makerOutcomeIndex: 0,
      takerOutcomeIndex: null,
      stakeRaw: brlToRaw(100),
      loserFeeRaw: brlToRaw(3),
      expiresAt: '2026-06-27T10:00:00.000Z',
      betId: null,
    },
  });
  assert.equal(pending.invite.isRecipientRestricted, true);
  assert.equal(pending.invite.recipientEmailHint, 't***@example.test');
  assert.equal(pending.invite.recipientAccess, 'allowed');
  assert.equal(pending.template?.title, 'Will Driver B win?');
});

test('invite UI includes email/link modes, pending inbox, and login return path', () => {
  const source = readFileSync(resolve('src/App.tsx'), 'utf8');
  assert.match(source, /useState<'email' \| 'link'>\('email'\)/);
  assert.match(source, /refreshPendingInvites/);
  assert.match(source, /safeReturnTo\(params\.get\('returnTo'\)\)/);
  assert.match(source, /PendingInvitePrompt/);
  assert.match(source, /cancelInvite\(token, draftInviteId\)/);
  assert.match(source, /finishAcceptance/);
  assert.match(source, /inviteHasExpired/);
  assert.match(source, /connectLinkedWallet/);
  assert.match(source, /unlinkWallet/);
});

test('frontend source does not expose M3.5 primary flow labels or raw web3 jargon', () => {
  const source = [
    readFileSync(resolve('src/App.tsx'), 'utf8'),
    readFileSync(resolve('src/lib/i18n.ts'), 'utf8'),
  ].join('\n');
  for (const forbidden of ['Pix', 'Stripe', 'Depositar', 'Sacar', 'ERC-2612', 'EIP-712', 'Polygon', 'escrow']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
