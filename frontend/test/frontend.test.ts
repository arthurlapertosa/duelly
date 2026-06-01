import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiError, api } from '../src/lib/api.ts';
import { ACCOUNT_REFRESH_INTERVAL_MS, startAccountDataPolling } from '../src/lib/accountDataPolling.ts';
import { errorCodeFrom, errorKeyFor, errorMessage, knownErrorCodes } from '../src/lib/errors.ts';
import { brlToRaw, formatBRL, potentialPayoutRaw } from '../src/lib/format.ts';
import { defaultLocale, locales, missingTranslationKeys, translate } from '../src/lib/i18n.ts';
import { deriveBetStatus, inviteHasExpired, mapIndexedBet, mapPendingInvite, mapTemplate } from '../src/lib/mappers.ts';
import { filterTemplates } from '../src/lib/templateFilters.ts';
import { templateDisplay } from '../src/lib/templateDisplay.ts';
import { ensureInjectedWalletChain, metaMaskTypedPayload, type Eip1193Provider } from '../src/lib/wallet.ts';
import type { BalanceView, BetSummaryView, PendingInviteView, TemplateView } from '../src/lib/types.ts';

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

test('injected wallet switches to the typed-data chain before requesting signatures', async () => {
  const calls: Array<{ method: string; params?: unknown[] }> = [];
  const provider: Eip1193Provider = {
    async request<T>({ method, params }: { method: string; params?: unknown[] }) {
      calls.push({ method, params });
      if (method === 'eth_chainId') return '0x1' as T;
      if (method === 'wallet_switchEthereumChain') return null as T;
      throw new Error(`unexpected method ${method}`);
    },
  };

  await ensureInjectedWalletChain(provider, typedPayloadForChain(137));

  assert.deepEqual(calls, [
    { method: 'eth_chainId', params: undefined },
    { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] },
  ]);
});

test('injected wallet adds Polygon before switching when the chain is missing', async () => {
  const calls: Array<{ method: string; params?: unknown[] }> = [];
  let switchAttempts = 0;
  const provider: Eip1193Provider = {
    async request<T>({ method, params }: { method: string; params?: unknown[] }) {
      calls.push({ method, params });
      if (method === 'eth_chainId') return '0x1' as T;
      if (method === 'wallet_switchEthereumChain') {
        switchAttempts += 1;
        if (switchAttempts === 1) throw { code: 4902, message: 'Unrecognized chain ID' };
        return null as T;
      }
      if (method === 'wallet_addEthereumChain') return null as T;
      throw new Error(`unexpected method ${method}`);
    },
  };

  await ensureInjectedWalletChain(provider, typedPayloadForChain('137'));

  assert.deepEqual(calls.map((call) => call.method), [
    'eth_chainId',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
  ]);
  assert.deepEqual(calls[1].params, [{ chainId: '0x89' }]);
  assert.deepEqual(calls[3].params, [{ chainId: '0x89' }]);
  const addParams = calls[2].params?.[0] as { chainId?: string; rpcUrls?: string[] };
  assert.equal(addParams.chainId, '0x89');
  assert.ok(Array.isArray(addParams.rpcUrls));
  assert.ok(addParams.rpcUrls.length > 0);
});

test('injected wallet skips network switching when the typed-data chain is already active', async () => {
  const calls: Array<{ method: string; params?: unknown[] }> = [];
  const provider: Eip1193Provider = {
    async request<T>({ method, params }: { method: string; params?: unknown[] }) {
      calls.push({ method, params });
      if (method === 'eth_chainId') return '0x89' as T;
      throw new Error(`unexpected method ${method}`);
    },
  };

  await ensureInjectedWalletChain(provider, typedPayloadForChain(137n));

  assert.deepEqual(calls, [{ method: 'eth_chainId', params: undefined }]);
});

test('injected wallet checks chain before signing typed data', () => {
  const walletSource = readFileSync(resolve('src/lib/wallet.ts'), 'utf8');
  assert.match(walletSource, /await ensureInjectedWalletChain\(provider, payload\)/);
});

test('wallet verification asks the browser wallet to choose an account', () => {
  const walletSource = readFileSync(resolve('src/lib/wallet.ts'), 'utf8');
  const storeSource = readFileSync(resolve('src/store/useAppStore.ts'), 'utf8');
  assert.match(walletSource, /wallet_requestPermissions/);
  assert.match(walletSource, /eth_accounts/);
  assert.match(storeSource, /adapter\.selectAccount\(\)/);
});

test('account data poller refreshes only while authenticated, visible, and online', () => {
  let token: string | null = null;
  let visibility: DocumentVisibilityState = 'visible';
  let online = true;
  const intervals: Array<{ handler: () => void; timeout: number }> = [];
  const listeners = new Map<string, EventListener>();
  const signals: AbortSignal[] = [];
  const stop = startAccountDataPolling({
    getToken: () => token,
    refresh: async ({ signal }) => {
      signals.push(signal);
    },
    setInterval: (handler, timeout) => {
      intervals.push({ handler, timeout });
      return intervals.length;
    },
    clearInterval: () => undefined,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    visibilityState: () => visibility,
    isOnline: () => online,
  });

  assert.equal(intervals[0]?.timeout, ACCOUNT_REFRESH_INTERVAL_MS);
  intervals[0].handler();
  assert.equal(signals.length, 0);

  token = 'token-a';
  intervals[0].handler();
  assert.equal(signals.length, 1);

  visibility = 'hidden';
  intervals[0].handler();
  assert.equal(signals.length, 1);

  visibility = 'visible';
  online = false;
  listeners.get('focus')?.(new Event('focus'));
  assert.equal(signals.length, 1);

  online = true;
  listeners.get('online')?.(new Event('online'));
  assert.equal(signals.length, 2);

  stop();
});

test('account data poller cleanup removes listeners and aborts active refreshes', () => {
  let clearedInterval = 0;
  const removed = new Set<string>();
  let activeSignal: AbortSignal | null = null;
  const intervals: Array<() => void> = [];
  const stop = startAccountDataPolling({
    getToken: () => 'token-a',
    refresh: ({ signal }) => {
      activeSignal = signal;
      return new Promise(() => undefined);
    },
    setInterval: (handler) => {
      intervals.push(handler);
      return 7;
    },
    clearInterval: (id) => {
      clearedInterval = id;
    },
    addEventListener: () => undefined,
    removeEventListener: (type) => {
      removed.add(type);
    },
    visibilityState: () => 'visible',
    isOnline: () => true,
  });

  intervals[0]();
  assert.equal(activeSignal?.aborted, false);
  stop();
  assert.equal(clearedInterval, 7);
  assert.deepEqual([...removed].sort(), ['focus', 'online', 'visibilitychange']);
  assert.equal(activeSignal?.aborted, true);
});

test('account data refresh is single-flight and force queues one follow-up refresh', async () => {
  const { useAppStore } = await loadStoreForTest();
  resetAppStoreForTest(useAppStore);
  let balanceCalls = 0;
  let releaseBalance: (() => void) | null = null;
  const originals = patchAccountApi({
    getBalance: async () => {
      balanceCalls += 1;
      await new Promise<void>((resolve) => {
        releaseBalance = resolve;
      });
      return balanceForTest(String(balanceCalls));
    },
    listMyBets: async () => [],
    listPendingInvites: async () => [],
  });

  try {
    const first = useAppStore.getState().refreshAccountData();
    const second = useAppStore.getState().refreshAccountData();
    const forced = useAppStore.getState().refreshAccountData({ force: true });
    assert.equal(balanceCalls, 1);
    releaseBalance?.();
    for (let attempt = 0; attempt < 10 && balanceCalls < 2; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(balanceCalls, 2);
    releaseBalance?.();
    await Promise.all([first, second, forced]);
    assert.equal(balanceCalls, 2);
    assert.equal(useAppStore.getState().balance?.balanceRaw, '2');
  } finally {
    restoreAccountApi(originals);
  }
});

test('account data refresh preserves stale data on partial failure', async () => {
  const { useAppStore } = await loadStoreForTest();
  resetAppStoreForTest(useAppStore);
  const staleBets = [{ invite: { id: 'stale-invite' } } as BetSummaryView];
  useAppStore.setState({ bets: staleBets, betsLoaded: true });
  const originals = patchAccountApi({
    getBalance: async () => balanceForTest('42'),
    listMyBets: async () => {
      throw new Error('NETWORK_ERROR');
    },
    listPendingInvites: async () => [{ invite: { id: 'pending-invite' } } as PendingInviteView],
  });

  try {
    await useAppStore.getState().refreshAccountData({ force: true });
    const state = useAppStore.getState();
    assert.equal(state.balance?.balanceRaw, '42');
    assert.equal(state.balanceLoaded, true);
    assert.equal(state.bets, staleBets);
    assert.equal(state.pendingInvites[0]?.invite.id, 'pending-invite');
    assert.equal(state.pendingInvitesLoaded, true);
  } finally {
    restoreAccountApi(originals);
  }
});

test('account data refresh clears unauthenticated sessions and ignores stale token results', async () => {
  const { useAppStore } = await loadStoreForTest();
  resetAppStoreForTest(useAppStore);
  const unauthOriginals = patchAccountApi({
    getBalance: async () => {
      throw new ApiError('UNAUTHENTICATED');
    },
    listMyBets: async () => [],
    listPendingInvites: async () => [],
  });

  try {
    await useAppStore.getState().refreshAccountData({ force: true });
    assert.equal(useAppStore.getState().token, null);
  } finally {
    restoreAccountApi(unauthOriginals);
  }

  resetAppStoreForTest(useAppStore);
  let releaseBalance: (() => void) | null = null;
  const staleOriginals = patchAccountApi({
    getBalance: async () => {
      await new Promise<void>((resolve) => {
        releaseBalance = resolve;
      });
      return balanceForTest('99');
    },
    listMyBets: async () => [],
    listPendingInvites: async () => [],
  });

  try {
    const refresh = useAppStore.getState().refreshAccountData({ force: true });
    useAppStore.setState({ token: null, balance: null, balanceLoaded: false });
    releaseBalance?.();
    await refresh;
    assert.equal(useAppStore.getState().balance, null);
    assert.equal(useAppStore.getState().balanceLoaded, false);
  } finally {
    restoreAccountApi(staleOriginals);
  }
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

function typedPayloadForChain(chainId: number | bigint | string) {
  return {
    domain: {
      name: 'DuellyBetEscrowBRL1',
      version: '1',
      chainId,
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
  };
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

async function loadStoreForTest() {
  installWindowForStoreTest();
  return await import('../src/store/useAppStore.ts');
}

function installWindowForStoreTest() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
  (globalThis as { window?: unknown }).window = {
    localStorage,
    setTimeout,
    clearTimeout,
  };
}

function resetAppStoreForTest(useAppStore: typeof import('../src/store/useAppStore.ts').useAppStore) {
  useAppStore.setState({
    locale: 'en-US',
    token: 'token-a',
    user: null,
    wallet: null,
    balance: null,
    templates: [],
    bets: [],
    pendingInvites: [],
    loading: false,
    balanceLoaded: false,
    templatesLoaded: false,
    betsLoaded: false,
    pendingInvitesLoaded: false,
    accountRefreshInFlight: false,
    accountLastRefreshedAt: null,
    error: null,
  });
}

function balanceForTest(balanceRaw: string): BalanceView {
  return {
    wallet: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    token: '0x0000000000000000000000000000000000001001',
    symbol: 'BRL1',
    decimals: 18,
    balanceRaw,
    allowanceRaw: '0',
    permitNonce: '0',
    spender: '0x0000000000000000000000000000000000001002',
  };
}

function patchAccountApi(methods: {
  getBalance: typeof api.getBalance;
  listMyBets: typeof api.listMyBets;
  listPendingInvites: typeof api.listPendingInvites;
}) {
  const originals = {
    getBalance: api.getBalance,
    listMyBets: api.listMyBets,
    listPendingInvites: api.listPendingInvites,
  };
  api.getBalance = methods.getBalance;
  api.listMyBets = methods.listMyBets;
  api.listPendingInvites = methods.listPendingInvites;
  return originals;
}

function restoreAccountApi(originals: ReturnType<typeof patchAccountApi>) {
  api.getBalance = originals.getBalance;
  api.listMyBets = originals.listMyBets;
  api.listPendingInvites = originals.listPendingInvites;
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

test('indexed bet mapper preserves public receipt links and defaults missing receipts', () => {
  const fundingTx = `0x${'11'.repeat(32)}`;
  const settlementTx = `0x${'12'.repeat(32)}`;
  const bet = mapIndexedBet({
    betId: '1',
    inviteId: 'invite-1',
    templateHash: `0x${'01'.repeat(32)}`,
    conditionId: `0x${'02'.repeat(32)}`,
    playerA: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    playerB: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    playerAOutcomeIndex: 0,
    playerBOutcomeIndex: 1,
    stake: brlToRaw(50),
    loserFee: brlToRaw(3),
    status: 'Resolved',
    winner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    winnerPayout: brlToRaw(103),
    treasuryPayout: brlToRaw(3),
    updatedAt: '2026-06-01T00:00:00.000Z',
    receipts: {
      funding: {
        transactionHash: fundingTx,
        blockNumber: '100',
        url: `https://polygonscan.com/tx/${fundingTx}`,
      },
      settlement: {
        transactionHash: settlementTx,
        blockNumber: '101',
        url: `https://polygonscan.com/tx/${settlementTx}`,
      },
      contract: {
        address: '0xcccccccccccccccccccccccccccccccccccccccc',
        url: 'https://polygonscan.com/address/0xcccccccccccccccccccccccccccccccccccccccc',
      },
    },
  });

  assert.equal(bet.receipts.funding?.url, `https://polygonscan.com/tx/${fundingTx}`);
  assert.equal(bet.receipts.funding?.blockNumber, '100');
  assert.equal(bet.receipts.settlement?.url, `https://polygonscan.com/tx/${settlementTx}`);
  assert.equal(bet.receipts.contract?.address, '0xcccccccccccccccccccccccccccccccccccccccc');

  const withoutReceipts = mapIndexedBet({ ...bet, stake: bet.stakeRaw, loserFee: bet.loserFeeRaw, updatedAt: bet.updatedAt, receipts: undefined });
  assert.deepEqual(withoutReceipts.receipts, { funding: null, settlement: null, contract: null });
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
