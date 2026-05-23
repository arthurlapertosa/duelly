import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiError } from '../src/lib/api.ts';
import { errorCodeFrom, errorKeyFor, errorMessage, knownErrorCodes } from '../src/lib/errors.ts';
import { brlToRaw, formatBRL, potentialPayoutRaw } from '../src/lib/format.ts';
import { defaultLocale, locales, missingTranslationKeys, translate } from '../src/lib/i18n.ts';
import { deriveBetStatus, inviteHasExpired, mapPendingInvite, mapTemplate } from '../src/lib/mappers.ts';
import { filterTemplates } from '../src/lib/templateFilters.ts';
import { templateDisplay } from '../src/lib/templateDisplay.ts';
import { metaMaskTypedPayload } from '../src/lib/wallet.ts';
import type { BetSummaryView, TemplateView } from '../src/lib/types.ts';

test('locales are complete and provide both default languages', () => {
  assert.deepEqual(missingTranslationKeys(), []);
  assert.equal(translate('pt-BR', 'auth.enter'), 'Entrar');
  assert.equal(translate('en-US', 'auth.enter'), 'Sign in');
  assert.equal(defaultLocale, 'en-US');
  assert.deepEqual(locales, ['en-US', 'pt-BR']);
});

test('onboarding defaults to sign in with empty credentials', () => {
  const source = readFileSync(resolve('src/screens/OnboardingScreen.tsx'), 'utf8');
  assert.match(source, /useState<'login' \| 'register'>\('login'\)/);
  assert.match(source, /useState\(''\)/);
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

test('template text filter combines category tabs with searchable template text', () => {
  const templates = filterFixtureTemplates();

  assert.deepEqual(
    filterTemplates(templates, { category: 'tennis', query: '' }).map((template) => template.id),
    ['tennis-roland-garros', 'tennis-sao-paulo'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'tennis', query: '  ' }).map((template) => template.id),
    ['tennis-roland-garros', 'tennis-sao-paulo'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'all', query: 'holmgren' }).map((template) => template.id),
    ['tennis-roland-garros'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'all', query: 'daniel jade' }).map((template) => template.id),
    ['tennis-roland-garros'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'all', query: 'CARLOS' }).map((template) => template.id),
    ['tennis-sao-paulo'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'all', query: 'sao paulo' }).map((template) => template.id),
    ['tennis-sao-paulo'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'all', query: 'polymarket' }).map((template) => template.id),
    ['tennis-roland-garros', 'tennis-sao-paulo', 'f1-austria'],
  );
  assert.deepEqual(
    filterTemplates(templates, { category: 'f1', query: 'tennis' }).map((template) => template.id),
    [],
  );
});

test('explore screen requests backend paginated template filters', () => {
  const source = readFileSync(resolve('src/screens/TemplatesScreen.tsx'), 'utf8');
  assert.match(source, /api\.listTemplates\(\{/);
  assert.match(source, /category: backendCategory/);
  assert.match(source, /query: debouncedQuery/);
  assert.match(source, /cursor/);
  assert.match(source, /IntersectionObserver/);
});

test('create invite screen fetches a missing template by id', () => {
  const source = readFileSync(resolve('src/screens/CreateInviteScreen.tsx'), 'utf8');
  assert.match(source, /api\.getTemplate\(templateId\)/);
  assert.match(source, /upsertTemplate\(item\)/);
});

function filterFixtureTemplates(): TemplateView[] {
  const base = {
    source: 'Polymarket',
    rulesSummary: 'Official result',
    outcomeIndexes: [0, 1],
    eventStartAt: '2026-06-01T10:00:00.000Z',
    bettingCloseAt: '2026-06-01T12:00:00.000Z',
    resolutionDeadline: '2026-06-02T12:00:00.000Z',
    loserFeeBps: 250,
    active: true,
  } satisfies Partial<TemplateView>;

  return [
    {
      ...base,
      id: 'tennis-roland-garros',
      templateHash: `0x${'01'.repeat(32)}`,
      conditionId: `0x${'02'.repeat(32)}`,
      title: 'Roland Garros, Qualification ATP: August Holmgren vs Daniel Jade',
      category: 'tennis',
      outcomes: ['August Holmgren', 'Daniel Jade'],
    },
    {
      ...base,
      id: 'tennis-sao-paulo',
      templateHash: `0x${'03'.repeat(32)}`,
      conditionId: `0x${'04'.repeat(32)}`,
      title: 'São Paulo Open: Carlos Silva vs João Lima',
      category: 'tennis',
      outcomes: ['Carlos Silva', 'João Lima'],
    },
    {
      ...base,
      id: 'f1-austria',
      templateHash: `0x${'05'.repeat(32)}`,
      conditionId: `0x${'06'.repeat(32)}`,
      title: 'Will Driver B win the 2026 Austria sprint race?',
      category: 'f1',
      outcomes: ['Yes', 'No'],
    },
  ];
}

function discoverStructuredErrorCodes(): string[] {
  const files = [
    ...walk(resolve('..', 'backend', 'src')),
    ...walk(resolve('src')),
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
      display: {
        question: 'Will Driver B win?',
        ptBR: {
          question: 'Driver B vence?',
          rulesSummary: 'A classificação oficial decide o duelo.',
          outcomes: ['Sim', 'Não'],
        },
      },
      outcomeA: { label: 'Yes', providerOutcomeIndex: 0 },
      outcomeB: { label: 'No', providerOutcomeIndex: 1 },
      eventStartAt: 1782547200,
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
  assert.equal(pending.template?.display?.ptBR?.question, 'Driver B vence?');
});

test('template mapper preserves event start separately from provider close', () => {
  const template = mapTemplate({
    templateId: 'live-tennis',
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId: `0x${'02'.repeat(32)}`,
    sport: 'tennis',
    display: {
      question: 'Geneva Open: Mariano Navone vs Learner Tien',
    },
    outcomeA: { label: 'Mariano Navone', providerOutcomeIndex: 0 },
    outcomeB: { label: 'Learner Tien', providerOutcomeIndex: 1 },
    eventStartAt: 1779541200,
    bettingCloseAt: 1780146000,
    resolutionDeadline: 1781355600,
    loserFeeBps: 250,
    active: true,
  });

  assert.equal(template.eventStartAt, '2026-05-23T13:00:00.000Z');
  assert.equal(template.bettingCloseAt, '2026-05-30T13:00:00.000Z');
});

test('template screens render event start and block resolved detail errors', () => {
  const card = readFileSync(resolve('src/components/TemplateCard.tsx'), 'utf8');
  const detail = readFileSync(resolve('src/screens/TemplateDetailScreen.tsx'), 'utf8');

  assert.match(card, /templates\.starts/);
  assert.match(detail, /api\.getTemplate\(id\)/);
  assert.match(detail, /setDetailError\(errorMessage\(locale, error\)\)/);
  assert.match(detail, /if \(detailError\)/);
  assert.match(detail, /navigate\('\/templates'\)/);
  assert.match(detail, /templates\.starts/);
});

test('template display selects PT backend copy and falls back to localized generic outcomes', () => {
  const template = {
    id: 'fixture-f1-sprint-winner',
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId: `0x${'02'.repeat(32)}`,
    title: 'Will Driver B win?',
    category: 'f1',
    source: 'Polymarket',
    rulesSummary: 'Result follows the official classification.',
    outcomes: ['Yes', 'No'],
    outcomeIndexes: [0, 1],
    eventStartAt: '2026-06-27T08:00:00.000Z',
    bettingCloseAt: '2026-06-27T10:00:00.000Z',
    resolutionDeadline: '2026-06-30T10:00:00.000Z',
    loserFeeBps: 250,
    active: true,
    display: {
      ptBR: {
        question: 'Driver B vence?',
        rulesSummary: 'A classificação oficial decide o duelo.',
        outcomes: ['Sim', 'Não'],
      },
    },
  } satisfies TemplateView;

  assert.equal(templateDisplay(template, 'en-US').question, 'Will Driver B win?');
  assert.deepEqual(templateDisplay(template, 'en-US').outcomes, ['Yes', 'No']);
  assert.equal(templateDisplay(template, 'pt-BR').question, 'Driver B vence?');
  assert.deepEqual(templateDisplay(template, 'pt-BR').outcomes, ['Sim', 'Não']);

  const withoutPt = { ...template, display: undefined } satisfies TemplateView;
  assert.equal(templateDisplay(withoutPt, 'pt-BR').question, 'Will Driver B win?');
  assert.deepEqual(templateDisplay(withoutPt, 'pt-BR').outcomes, ['Sim', 'Não']);
});

function readSrcTree(): string {
  return walk(resolve('src'))
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

test('invite UI includes email/link modes, pending inbox, and login return path', () => {
  const source = readSrcTree();
  assert.match(source, /useState<'email' \| 'link'>\('email'\)/);
  assert.match(source, /refreshPendingInvites/);
  assert.match(source, /pendingInvites\.map\(/);
  assert.match(source, /<PendingInviteCard/);
  assert.match(source, /safeReturnTo\(params\.get\('returnTo'\)\)/);
  assert.match(source, /cancelInvite\(token, draftInviteId\)/);
  assert.match(source, /finishAcceptance/);
  assert.match(source, /inviteHasExpired/);
  assert.match(source, /customStakeToRaw/);
  assert.match(source, /template\.customAmount/);
  assert.match(source, /selectedOutcomeIndex/);
  assert.match(source, /bet\.yourPick/);
  assert.match(source, /winnerRole/);
  assert.match(source, /currentUserWon/);
  assert.match(source, /bet\.result\.youWon/);
  assert.match(source, /bet\.result\.youLost/);
  assert.match(source, /connectLinkedWallet/);
  assert.match(source, /unlinkWallet/);
});

test('the floating pending-invite prompt is not rendered alongside the in-page inbox', () => {
  const source = readSrcTree();
  assert.equal(source.includes('PendingInvitePrompt'), false);
});

test('frontend source does not expose M3.5 primary flow labels or raw web3 jargon', () => {
  // The user-facing surface (screens, components, app shell, copy) must hide web3
  // jargon. The lib/ abstraction layer legitimately handles those internals.
  const source = [
    ...walk(resolve('src/app')),
    ...walk(resolve('src/screens')),
    ...walk(resolve('src/components')),
    resolve('src/lib/i18n.ts'),
  ]
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  for (const forbidden of ['Pix', 'Stripe', 'Depositar', 'Sacar', 'ERC-2612', 'EIP-712', 'Polygon', 'escrow']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
