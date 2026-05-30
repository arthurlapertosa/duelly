import { brlToRaw } from './format';
import { mapBetSummary, mapIndexedBet, mapInvite, mapPendingInvite, mapTemplate } from './mappers';
import type {
  ApiMode,
  BalanceView,
  BetSummaryView,
  FeeQuoteView,
  FundingReadinessView,
  Hex,
  IndexedBetView,
  InviteView,
  PendingInviteView,
  PermitSubmission,
  TemplateListInput,
  TemplateListResult,
  TemplateView,
  TypedPayload,
  UserView,
  WalletView,
} from './types';

export interface AuthResult {
  token: string;
  user: UserView;
}

export interface InviteCreateResult {
  invite: InviteView;
  offerPayload: TypedPayload;
  makerPermitPayload: TypedPayload;
  requiredFundingRaw: string;
}

export interface PublicInviteResult {
  invite: InviteView;
  template: TemplateView | null;
  requiredFundingRaw: string;
}

export interface InviteAcceptResult {
  invite: InviteView;
  acceptancePayload: TypedPayload;
  takerPermitPayload: TypedPayload;
  requiredFundingRaw: string;
}

export interface TakerAuthorizationResult {
  invite: InviteView;
  funding: { requestId: string; transactionHash: Hex | null; status: string; betId: string | null };
}

export interface ApiRequestOptions {
  signal?: AbortSignal;
}

export interface DuellyApi {
  mode: ApiMode;
  login(email: string, password: string): Promise<AuthResult>;
  register(email: string, password: string): Promise<AuthResult>;
  me(token: string): Promise<{ user: UserView; wallet: WalletView | null }>;
  logout(token: string): Promise<void>;
  createWalletChallenge(token: string, address: Hex): Promise<{ id: string; address: Hex; chainId: number; message: string; expiresAt: string }>;
  linkWallet(token: string, challengeId: string, signature: Hex): Promise<WalletView>;
  unlinkWallet(token: string): Promise<WalletView>;
  getWallet(token: string): Promise<WalletView | null>;
  getBalance(token: string, options?: ApiRequestOptions): Promise<BalanceView | null>;
  getReadiness(token: string, stakeRaw: string, loserFeeRaw: string): Promise<FundingReadinessView>;
  listTemplates(input?: TemplateListInput): Promise<TemplateListResult>;
  getTemplate(id: string): Promise<TemplateView | null>;
  quoteLoserFee(stakeRaw: string, loserFeeBps: number): Promise<FeeQuoteView>;
  createInvite(token: string, input: { templateId: string; stakeRaw: string; loserFeeRaw: string; makerOutcomeIndex: number; recipientEmail?: string }): Promise<InviteCreateResult>;
  authorizeMaker(token: string, inviteId: string, offerSignature: Hex, makerPermit: PermitSubmission): Promise<{ invite: InviteView; requiredFundingRaw: string }>;
  cancelInvite(token: string, inviteId: string): Promise<InviteView>;
  getInvite(inviteId: string, token?: string | null): Promise<PublicInviteResult | null>;
  acceptInvite(token: string, inviteId: string, takerOutcomeIndex: number): Promise<InviteAcceptResult>;
  authorizeTaker(token: string, inviteId: string, acceptanceSignature: Hex, takerPermit: PermitSubmission): Promise<TakerAuthorizationResult>;
  listPendingInvites(token: string, options?: ApiRequestOptions): Promise<PendingInviteView[]>;
  listMyBets(token: string, options?: ApiRequestOptions): Promise<BetSummaryView[]>;
  getBet(betId: string): Promise<IndexedBetView | null>;
  getBetByInvite(inviteId: string): Promise<IndexedBetView | null>;
  resolveFixtureBet(betId: string, outcome: 'a' | 'b' | 'void'): Promise<IndexedBetView | null>;
}

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const apiMode = (viteEnv.VITE_DUELLY_API_MODE === 'http' ? 'http' : 'fixture') as ApiMode;
const apiBaseUrl = String(viteEnv.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const templateMode = viteEnv.VITE_DUELLY_TEMPLATE_MODE === 'live' ? 'live' : 'fixture';

export const api: DuellyApi = apiMode === 'http' ? createHttpApi(apiBaseUrl) : createFixtureApi();

export class ApiError extends Error {
  constructor(readonly code: string, message = code) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && options.body !== null && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === 'error') throw new ApiError(String(body.code ?? response.statusText));
  return body as T;
}

function createHttpApi(baseUrl: string): DuellyApi {
  void baseUrl;
  return {
    mode: 'http',
    login: (email, password) => request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email, password) => request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: (token) => request<{ user: UserView; wallet: WalletView | null }>('/auth/me', { token }),
    logout: async (token) => { await request('/auth/logout', { method: 'POST', token }); },
    createWalletChallenge: (token, address) => request('/wallets/challenges', { method: 'POST', token, body: JSON.stringify({ address }) }),
    linkWallet: async (token, challengeId, signature) => {
      const body = await request<{ wallet: WalletView }>('/wallets/link', { method: 'POST', token, body: JSON.stringify({ challengeId, signature }) });
      return body.wallet;
    },
    unlinkWallet: async (token) => {
      const body = await request<{ wallet: WalletView }>('/wallets/me', { method: 'DELETE', token });
      return body.wallet;
    },
    getWallet: async (token) => {
      try {
        const body = await request<{ wallet: WalletView }>('/wallets/me', { token });
        return body.wallet;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'WALLET_NOT_LINKED') return null;
        throw error;
      }
    },
    getBalance: async (token, options = {}) => {
      try {
        return await request<BalanceView>('/wallets/me/brl1', { token, signal: options.signal });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'WALLET_NOT_LINKED') return null;
        throw error;
      }
    },
    getReadiness: (token, stakeRaw, loserFeeRaw) => request('/wallets/me/funding-readiness', {
      method: 'POST',
      token,
      body: JSON.stringify({ stake: stakeRaw, loserFee: loserFeeRaw }),
    }),
    listTemplates: async (input = {}) => {
      const params = new URLSearchParams({ mode: templateMode, limit: String(input.limit ?? 25) });
      if (input.category && input.category !== 'all') params.set('sport', input.category);
      const query = input.query?.trim();
      if (query) params.set('q', query);
      if (input.cursor) params.set('cursor', input.cursor);
      const body = await request<{
        templates: unknown[];
        count?: number;
        pageCount?: number;
        nextCursor?: string | null;
        refreshedAt?: string | null;
        stale?: boolean;
      }>(`/templates?${params.toString()}`, { signal: input.signal });
      return {
        templates: body.templates.map((item) => mapTemplate(item as never)),
        count: Number(body.count ?? body.templates.length),
        pageCount: Number(body.pageCount ?? body.templates.length),
        nextCursor: body.nextCursor ?? null,
        refreshedAt: body.refreshedAt ?? null,
        stale: Boolean(body.stale),
      };
    },
    getTemplate: async (id) => {
      try {
        const body = await request<{ template: unknown }>(`/templates/${encodeURIComponent(id)}?mode=${templateMode}`);
        return mapTemplate(body.template as never);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'TEMPLATE_NOT_FOUND') return null;
        throw error;
      }
    },
    quoteLoserFee: (stakeRaw, loserFeeBps) => request('/fees/loser-fee', { method: 'POST', body: JSON.stringify({ stake: stakeRaw, loserFeeBps }) }),
    createInvite: async (token, input) => {
      const body = await request<{ invite: unknown; offerPayload: TypedPayload; makerPermitPayload: TypedPayload; requiredFundingRaw: string }>('/invites', {
        method: 'POST',
        token,
        body: JSON.stringify({
          templateId: input.templateId,
          stake: input.stakeRaw,
          loserFee: input.loserFeeRaw,
          makerOutcomeIndex: input.makerOutcomeIndex,
          recipientEmail: input.recipientEmail,
        }),
      });
      return { ...body, invite: mapInvite(body.invite as Record<string, unknown>) };
    },
    authorizeMaker: async (token, inviteId, offerSignature, makerPermit) => {
      const body = await request<{ invite: unknown; requiredFundingRaw: string }>(`/invites/${encodeURIComponent(inviteId)}/maker-authorizations`, {
        method: 'POST',
        token,
        body: JSON.stringify({ offerSignature, makerPermit }),
      });
      return { invite: mapInvite(body.invite as Record<string, unknown>), requiredFundingRaw: body.requiredFundingRaw };
    },
    cancelInvite: async (token, inviteId) => {
      const body = await request<{ invite: unknown }>(`/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE', token });
      return mapInvite(body.invite as Record<string, unknown>);
    },
    getInvite: async (inviteId, token) => {
      try {
        const body = await request<{ invite: unknown; template: unknown | null; requiredFundingRaw: string }>(
          `/invites/${encodeURIComponent(inviteId)}`,
          token ? { token } : {},
        );
        return {
          invite: mapInvite(body.invite as Record<string, unknown>),
          template: body.template ? mapTemplate(body.template as never) : null,
          requiredFundingRaw: body.requiredFundingRaw,
        };
      } catch (error) {
        if (error instanceof ApiError && error.code === 'INVITE_NOT_FOUND') return null;
        throw error;
      }
    },
    acceptInvite: async (token, inviteId, takerOutcomeIndex) => {
      const body = await request<{ invite: unknown; acceptancePayload: TypedPayload; takerPermitPayload: TypedPayload; requiredFundingRaw: string }>(
        `/invites/${encodeURIComponent(inviteId)}/accept`,
        { method: 'POST', token, body: JSON.stringify({ takerOutcomeIndex }) },
      );
      return { ...body, invite: mapInvite(body.invite as Record<string, unknown>) };
    },
    authorizeTaker: async (token, inviteId, acceptanceSignature, takerPermit) => {
      const body = await request<{ invite: unknown; funding: TakerAuthorizationResult['funding'] }>(
        `/invites/${encodeURIComponent(inviteId)}/taker-authorizations`,
        { method: 'POST', token, body: JSON.stringify({ acceptanceSignature, takerPermit }) },
      );
      return { invite: mapInvite(body.invite as Record<string, unknown>), funding: body.funding };
    },
    listPendingInvites: async (token, options = {}) => {
      const body = await request<{ invites: unknown[] }>('/me/invites/pending', { token, signal: options.signal });
      return body.invites.map((item) => mapPendingInvite(item as Record<string, unknown>));
    },
    listMyBets: async (token, options = {}) => {
      const body = await request<{ bets: unknown[] }>('/me/bets', { token, signal: options.signal });
      return body.bets.map((item) => mapBetSummary(item as Record<string, unknown>));
    },
    getBet: async (betId) => {
      try {
        const body = await request<{ bet: unknown }>(`/bets/${encodeURIComponent(betId)}`);
        return mapIndexedBet(body.bet as Record<string, unknown>);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'BET_NOT_FOUND') return null;
        throw error;
      }
    },
    getBetByInvite: async (inviteId) => {
      try {
        const body = await request<{ bet: unknown }>(`/invites/${encodeURIComponent(inviteId)}/bet`);
        return mapIndexedBet(body.bet as Record<string, unknown>);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'BET_NOT_FOUND') return null;
        throw error;
      }
    },
    resolveFixtureBet: async () => null,
  };
}

interface FixtureUser {
  id: string;
  email: string;
  password: string;
  wallet: WalletView | null;
  balanceRaw: string;
}

interface FixtureInvite extends InviteView {
  makerUserId: string;
  takerUserId: string | null;
  recipientEmail: string | null;
  offerPayload: TypedPayload;
  makerPermitPayload: TypedPayload;
  acceptancePayload: TypedPayload | null;
  takerPermitPayload: TypedPayload | null;
}

interface FixtureBet extends IndexedBetView {
  inviteId: string;
}

interface FixtureState {
  users: FixtureUser[];
  sessions: Record<string, string>;
  invites: FixtureInvite[];
  bets: FixtureBet[];
}

const fixtureKey = 'duelly-m4-fixture-state';
const fixtureTokenAddress = '0x0000000000000000000000000000000000001001';
const fixtureSpender = '0x0000000000000000000000000000000000001002';

const fixtureTemplates: TemplateView[] = [
  {
    id: 'fixture-f1-sprint-winner',
    templateHash: '0x0b28aa25b6eb1b834a251ba9aa935e2af639b1237c979e9ac2343e15dc5a0d7f',
    conditionId: '0x0808080808080808080808080808080808080808080808080808080808080808',
    title: 'Will Driver B win the 2026 Austria sprint race?',
    category: 'f1',
    source: 'Polymarket',
    rulesSummary: 'Result follows the official Formula 1 sprint classification. Cancelled sprints or no official classification void the duel.',
    outcomes: ['Yes', 'No'],
    display: {
      ptBR: {
        question: 'Driver B vence a sprint da Áustria de 2026?',
        rulesSummary: 'A classificação oficial da sprint decide o duelo. Cancelamento ou ausência de classificação oficial anula o duelo.',
        outcomes: ['Sim', 'Não'],
      },
    },
    outcomeIndexes: [0, 1],
    eventStartAt: '2026-06-27T08:00:00.000Z',
    bettingCloseAt: '2026-06-27T10:00:00.000Z',
    resolutionDeadline: '2026-06-30T10:00:00.000Z',
    loserFeeBps: 250,
    active: true,
  },
  {
    id: 'fixture-tennis-atp250-match-winner',
    templateHash: '0x8163810127682d0ea34b4adc98e8eeb8fcce34b68be641e01edeff99de60ccf6',
    conditionId: '0x0404040404040404040404040404040404040404040404040404040404040404',
    title: 'Will Player A defeat Player B at ATP 250 Doha?',
    category: 'tennis',
    source: 'Polymarket',
    rulesSummary: 'Result follows the official ATP match winner. Cancelled matches before a declared winner void the duel.',
    outcomes: ['Player A', 'Player B'],
    display: {
      ptBR: {
        question: 'Player A x Player B no ATP 250 Doha',
        rulesSummary: 'O vencedor oficial da partida decide o duelo. Cancelamento, WO, desistência sem vencedor oficial ou ausência de resultado oficial anula o duelo.',
        outcomes: ['Player A', 'Player B'],
      },
    },
    outcomeIndexes: [0, 1],
    eventStartAt: '2026-07-01T10:00:00.000Z',
    bettingCloseAt: '2026-07-01T12:00:00.000Z',
    resolutionDeadline: '2026-07-02T12:00:00.000Z',
    loserFeeBps: 250,
    active: true,
  },
  {
    id: 'fixture-ufc-main-event-winner',
    templateHash: '0x06af3d1e7e9858e2167be9f7d38de4da8c482ab68a8b58150779d6bd534b0a37',
    conditionId: '0x0606060606060606060606060606060606060606060606060606060606060606',
    title: 'Will Fighter A defeat Fighter B in the UFC 400 main event?',
    category: 'ufc',
    source: 'Polymarket',
    rulesSummary: 'Result follows the official UFC main event winner. Draw, no-contest, cancellation, or no official winner voids the duel.',
    outcomes: ['Fighter A', 'Fighter B'],
    display: {
      ptBR: {
        question: 'Fighter A x Fighter B na luta principal do UFC 400',
        rulesSummary: 'O vencedor oficial da luta principal decide o duelo. Empate, no-contest, cancelamento ou ausência de vencedor oficial anula o duelo.',
        outcomes: ['Fighter A', 'Fighter B'],
      },
    },
    outcomeIndexes: [0, 1],
    eventStartAt: '2026-11-01T00:00:00.000Z',
    bettingCloseAt: '2026-11-01T02:00:00.000Z',
    resolutionDeadline: '2026-11-02T02:00:00.000Z',
    loserFeeBps: 250,
    active: true,
  },
];

function fixtureTemplatePage(input: TemplateListInput): TemplateListResult {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const terms = searchTerms(input.query ?? '');
  const filtered = fixtureTemplates
    .filter((template) => !input.category || input.category === 'all' || template.category === input.category)
    .filter((template) => {
      if (terms.length === 0) return true;
      const searchable = normalizeTemplateSearchText(template);
      return terms.every((term) => searchable.includes(term));
    })
    .sort((left, right) => (
      Date.parse(left.eventStartAt) - Date.parse(right.eventStartAt)
      || left.id.localeCompare(right.id)
    ));
  const cursor = decodeTemplateCursor(input.cursor ?? null);
  const startIndex = cursor
    ? filtered.findIndex((template) => (
      Date.parse(template.eventStartAt) > cursor.eventStartAt
      || (Date.parse(template.eventStartAt) === cursor.eventStartAt && template.id > cursor.templateId)
    ))
    : 0;
  const page = filtered.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit + 1);
  const visible = page.length > limit ? page.slice(0, limit) : page;
  const last = visible.at(-1);
  return {
    templates: visible,
    count: filtered.length,
    pageCount: visible.length,
    nextCursor: page.length > limit && last ? encodeTemplateCursor({
      eventStartAt: Date.parse(last.eventStartAt),
      templateId: last.id,
    }) : null,
    refreshedAt: new Date().toISOString(),
    stale: false,
  };
}

function searchTerms(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

function normalizeTemplateSearchText(template: TemplateView): string {
  return normalizeSearchText([
    template.title,
    template.category,
    template.source,
    template.rulesSummary,
    ...template.outcomes,
    template.display?.ptBR?.question,
    template.display?.ptBR?.rulesSummary,
    ...(template.display?.ptBR?.outcomes ?? []),
  ].filter(Boolean).join(' '));
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function encodeTemplateCursor(cursor: { eventStartAt: number; templateId: string }): string {
  return encodeURIComponent(JSON.stringify(cursor));
}

function decodeTemplateCursor(value: string | null): { eventStartAt: number; templateId: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { eventStartAt?: unknown; templateId?: unknown };
    if (typeof parsed.eventStartAt !== 'number' || typeof parsed.templateId !== 'string') return null;
    return { eventStartAt: parsed.eventStartAt, templateId: parsed.templateId };
  } catch {
    return null;
  }
}

function createFixtureApi(): DuellyApi {
  return {
    mode: 'fixture',
    login: async (email, password) => {
      const state = readFixtureState();
      const normalized = normalizeFixtureEmail(email);
      const user = state.users.find((item) => item.email === normalized && item.password === password);
      if (!user) throw new ApiError('INVALID_CREDENTIALS');
      return saveSession(state, user);
    },
    register: async (email, password) => {
      const state = readFixtureState();
      const normalized = normalizeFixtureEmail(email);
      if (password.length < 8) throw new ApiError('PASSWORD_TOO_SHORT');
      const existing = state.users.find((item) => item.email === normalized);
      if (existing) throw new ApiError('EMAIL_ALREADY_REGISTERED');
      const user: FixtureUser = {
        id: `user-${state.users.length + 1}`,
        email: normalized,
        password,
        wallet: null,
        balanceRaw: brlToRaw(normalized.includes('low') ? 5 : 250),
      };
      state.users.push(user);
      return saveSession(state, user);
    },
    me: async (token) => {
      const { user } = requireFixtureUser(token);
      return { user: toUserView(user), wallet: user.wallet };
    },
    logout: async (token) => {
      const state = readFixtureState();
      delete state.sessions[token];
      writeFixtureState(state);
    },
    createWalletChallenge: async (_token, address) => ({
      id: `challenge-${Date.now()}`,
      address,
      chainId: 137,
      message: `Duelly wallet verification for ${address}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
    linkWallet: async (token, _challengeId, _signature) => {
      const { state, user } = requireFixtureUser(token);
      const address = fixtureAddressFor(user.email);
      const existing = state.users.find((item) => item.id !== user.id && item.wallet?.address === address);
      if (existing) throw new ApiError('WALLET_ALREADY_LINKED');
      user.wallet = { address, chainId: 137, verificationStatus: 'verified' };
      writeFixtureState(state);
      return user.wallet;
    },
    unlinkWallet: async (token) => {
      const { state, user } = requireFixtureUser(token);
      if (!user.wallet) throw new ApiError('WALLET_NOT_LINKED');
      const wallet = { ...user.wallet, verificationStatus: 'inactive' as const };
      user.wallet = null;
      writeFixtureState(state);
      return wallet;
    },
    getWallet: async (token) => requireFixtureUser(token).user.wallet,
    getBalance: async (token) => {
      const { user } = requireFixtureUser(token);
      if (!user.wallet) return null;
      return balanceForUser(user);
    },
    getReadiness: async (token, stakeRaw, loserFeeRaw) => {
      const { user } = requireFixtureUser(token);
      if (!user.wallet) throw new ApiError('WALLET_NOT_LINKED');
      const required = BigInt(stakeRaw) + BigInt(loserFeeRaw);
      const available = BigInt(user.balanceRaw);
      return {
        ...balanceForUser(user),
        stakeRaw,
        loserFeeRaw,
        requiredAmountRaw: required.toString(),
        availableAmountRaw: available.toString(),
        missingAmountRaw: available >= required ? '0' : (required - available).toString(),
        canAttemptBet: available >= required,
      };
    },
    listTemplates: async (input = {}) => fixtureTemplatePage(input),
    getTemplate: async (id) => fixtureTemplates.find((template) => template.id === id || template.templateHash === id) ?? null,
    quoteLoserFee: async (stakeRaw, loserFeeBps) => {
      const percentFee = BigInt(stakeRaw) * BigInt(loserFeeBps) / 10_000n;
      const minimum = brlToRaw(3);
      const selected = percentFee > BigInt(minimum) ? percentFee : BigInt(minimum);
      return {
        stakeRaw,
        loserFeeBps,
        percentFeeRaw: percentFee.toString(),
        gasAnchoredMinimumRaw: minimum,
        selectedLoserFeeRaw: selected.toString(),
        totalRequiredAmountRaw: (BigInt(stakeRaw) + selected).toString(),
      };
    },
    createInvite: async (token, input) => {
      const { state, user } = requireFixtureUser(token);
      if (!user.wallet) throw new ApiError('WALLET_NOT_LINKED');
      const template = fixtureTemplates.find((item) => item.id === input.templateId);
      if (!template) throw new ApiError('TEMPLATE_NOT_FOUND');
      const recipientEmail = input.recipientEmail ? normalizeFixtureEmail(input.recipientEmail) : null;
      if (recipientEmail === user.email) throw new ApiError('MAKER_CANNOT_INVITE_SELF');
      const invite: FixtureInvite = {
        id: `invite-${Date.now()}`,
        makerUserId: user.id,
        takerUserId: null,
        recipientEmail,
        status: 'draft',
        isRecipientRestricted: Boolean(recipientEmail),
        recipientEmailHint: recipientEmail ? maskFixtureEmail(recipientEmail) : null,
        recipientAccess: recipientEmail ? 'blocked' : 'open',
        templateHash: template.templateHash,
        conditionId: template.conditionId,
        makerAddress: user.wallet.address,
        takerAddress: null,
        makerOutcomeIndex: input.makerOutcomeIndex,
        takerOutcomeIndex: null,
        stakeRaw: input.stakeRaw,
        loserFeeRaw: input.loserFeeRaw,
        expiresAt: template.bettingCloseAt,
        betId: null,
        offerPayload: typedPayload('BetOffer', {
          maker: user.wallet.address,
          templateHash: template.templateHash,
          conditionId: template.conditionId,
          makerOutcomeIndex: input.makerOutcomeIndex,
          stake: input.stakeRaw,
          loserFee: input.loserFeeRaw,
        }),
        makerPermitPayload: permitPayload(user.wallet.address, (BigInt(input.stakeRaw) + BigInt(input.loserFeeRaw)).toString()),
        acceptancePayload: null,
        takerPermitPayload: null,
      };
      state.invites.unshift(invite);
      writeFixtureState(state);
      return {
        invite,
        offerPayload: invite.offerPayload,
        makerPermitPayload: invite.makerPermitPayload,
        requiredFundingRaw: (BigInt(input.stakeRaw) + BigInt(input.loserFeeRaw)).toString(),
      };
    },
    authorizeMaker: async (token, inviteId) => {
      const { state, user } = requireFixtureUser(token);
      const invite = findFixtureInvite(state, inviteId);
      if (invite.makerUserId !== user.id) throw new ApiError('INVITE_NOT_OWNED_BY_USER');
      invite.status = 'created';
      writeFixtureState(state);
      return { invite, requiredFundingRaw: (BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw)).toString() };
    },
    cancelInvite: async (token, inviteId) => {
      const { state, user } = requireFixtureUser(token);
      const invite = findFixtureInvite(state, inviteId);
      if (invite.makerUserId !== user.id) throw new ApiError('INVITE_NOT_OWNED_BY_USER');
      if (invite.status !== 'draft' && invite.status !== 'cancelled') throw new ApiError('INVITE_NOT_DRAFT');
      invite.status = 'cancelled';
      writeFixtureState(state);
      return invite;
    },
    getInvite: async (inviteId, token) => {
      const state = readFixtureState();
      const invite = state.invites.find((item) => item.id === inviteId && item.status !== 'draft' && item.status !== 'cancelled');
      if (!invite) return null;
      const user = token ? state.users.find((item) => item.id === state.sessions[token]) ?? null : null;
      const normalized = normalizeFixtureInvite(invite, user?.email);
      return {
        invite: normalized,
        template: fixtureTemplates.find((template) => template.templateHash === normalized.templateHash) ?? null,
        requiredFundingRaw: (BigInt(normalized.stakeRaw) + BigInt(normalized.loserFeeRaw)).toString(),
      };
    },
    acceptInvite: async (token, inviteId, takerOutcomeIndex) => {
      const { state, user } = requireFixtureUser(token);
      const invite = findFixtureInvite(state, inviteId);
      if (invite.recipientEmail && invite.recipientEmail !== user.email) throw new ApiError('INVITE_RECIPIENT_MISMATCH');
      if (!user.wallet) throw new ApiError('WALLET_NOT_LINKED');
      if (invite.status === 'accepted') {
        if (invite.takerUserId !== user.id) throw new ApiError('INVITE_NOT_OWNED_BY_USER');
        if (invite.takerOutcomeIndex !== takerOutcomeIndex || !invite.acceptancePayload || !invite.takerPermitPayload) throw new ApiError('INVITE_NOT_READY_FOR_TAKER_AUTHORIZATION');
        return {
          invite,
          acceptancePayload: invite.acceptancePayload,
          takerPermitPayload: invite.takerPermitPayload,
          requiredFundingRaw: (BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw)).toString(),
        };
      }
      if (invite.status !== 'created') throw new ApiError('INVITE_NOT_OPEN');
      invite.status = 'accepted';
      invite.takerUserId = user.id;
      invite.takerAddress = user.wallet.address;
      invite.recipientAccess = invite.recipientEmail ? 'allowed' : 'open';
      invite.takerOutcomeIndex = takerOutcomeIndex;
      invite.acceptancePayload = typedPayload('BetAcceptance', {
        taker: user.wallet.address,
        offerHash: `0x${'12'.repeat(32)}`,
        takerOutcomeIndex,
      });
      invite.takerPermitPayload = permitPayload(user.wallet.address, (BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw)).toString());
      writeFixtureState(state);
      return {
        invite,
        acceptancePayload: invite.acceptancePayload,
        takerPermitPayload: invite.takerPermitPayload,
        requiredFundingRaw: (BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw)).toString(),
      };
    },
    authorizeTaker: async (token, inviteId) => {
      const { state, user } = requireFixtureUser(token);
      const invite = findFixtureInvite(state, inviteId);
      if (invite.takerUserId !== user.id || !invite.takerAddress) throw new ApiError('INVITE_NOT_OWNED_BY_USER');
      if (invite.betId) {
        return { invite, funding: { requestId: `relayer-${Date.now()}`, transactionHash: `0x${'ab'.repeat(32)}`, status: 'succeeded', betId: invite.betId } };
      }
      invite.status = 'funding_submitted';
      writeFixtureState(state);
      window.setTimeout(() => completeFixtureFunding(invite.id), 1500);
      return { invite, funding: { requestId: `relayer-${Date.now()}`, transactionHash: null, status: 'submitted', betId: null } };
    },
    listPendingInvites: async (token) => {
      const { state, user } = requireFixtureUser(token);
      return state.invites
        .filter((invite) => invite.recipientEmail === user.email)
        .filter((invite) => invite.makerUserId !== user.id)
        .filter((invite) => invite.takerUserId === null)
        .filter((invite) => invite.status === 'created')
        .filter((invite) => new Date(invite.expiresAt) > new Date())
        .map((invite) => {
          const normalized = normalizeFixtureInvite(invite, user.email);
          return {
            invite: normalized,
            template: fixtureTemplates.find((template) => template.templateHash === normalized.templateHash) ?? null,
            requiredFundingRaw: (BigInt(normalized.stakeRaw) + BigInt(normalized.loserFeeRaw)).toString(),
          };
        });
    },
    listMyBets: async (token) => {
      const { state, user } = requireFixtureUser(token);
      return state.invites
        .filter((invite) => invite.makerUserId === user.id || invite.takerUserId === user.id)
        .filter((invite) => invite.status !== 'draft' && invite.status !== 'cancelled')
        .map((invite) => {
          const normalized = normalizeFixtureInvite(invite, user.email);
          const bet = invite.betId ? state.bets.find((item) => item.betId === invite.betId) ?? null : null;
          return {
            role: invite.makerUserId === user.id ? 'maker' : 'taker',
            invite: normalized,
            template: fixtureTemplates.find((template) => template.templateHash === normalized.templateHash) ?? null,
            requiredFundingRaw: (BigInt(normalized.stakeRaw) + BigInt(normalized.loserFeeRaw)).toString(),
            bet,
          };
        });
    },
    getBet: async (betId) => readFixtureState().bets.find((bet) => bet.betId === betId) ?? null,
    getBetByInvite: async (inviteId) => readFixtureState().bets.find((bet) => bet.inviteId === inviteId) ?? null,
    resolveFixtureBet: async (betId, outcome) => {
      const state = readFixtureState();
      const bet = state.bets.find((item) => item.betId === betId);
      if (!bet) return null;
      if (outcome === 'void') {
        bet.status = 'Voided';
        bet.winner = null;
        bet.winnerPayoutRaw = null;
        bet.treasuryPayoutRaw = '0';
      } else {
        bet.status = 'Resolved';
        bet.winner = outcome === 'a' ? bet.playerA : bet.playerB;
        bet.winnerPayoutRaw = (BigInt(bet.stakeRaw) * 2n + BigInt(bet.loserFeeRaw)).toString();
        bet.treasuryPayoutRaw = bet.loserFeeRaw;
      }
      bet.updatedAt = new Date().toISOString();
      writeFixtureState(state);
      return bet;
    },
  };
}

function readFixtureState(): FixtureState {
  const raw = window.localStorage.getItem(fixtureKey);
  if (!raw) return { users: [], sessions: {}, invites: [], bets: [] };
  return JSON.parse(raw) as FixtureState;
}

function writeFixtureState(state: FixtureState): void {
  window.localStorage.setItem(fixtureKey, JSON.stringify(state));
}

function completeFixtureFunding(inviteId: string): void {
  const state = readFixtureState();
  const invite = state.invites.find((item) => item.id === inviteId);
  if (!invite || invite.status !== 'funding_submitted' || !invite.takerAddress) return;
  const bet: FixtureBet = {
    betId: `bet-${state.bets.length + 1}`,
    inviteId: invite.id,
    templateHash: invite.templateHash,
    conditionId: invite.conditionId,
    playerA: invite.makerAddress,
    playerB: invite.takerAddress,
    playerAOutcomeIndex: invite.makerOutcomeIndex,
    playerBOutcomeIndex: invite.takerOutcomeIndex ?? 1,
    stakeRaw: invite.stakeRaw,
    loserFeeRaw: invite.loserFeeRaw,
    status: 'Funded',
    winner: null,
    winnerPayoutRaw: null,
    treasuryPayoutRaw: null,
    updatedAt: new Date().toISOString(),
  };
  invite.status = 'funded';
  invite.betId = bet.betId;
  state.bets.unshift(bet);
  debitUser(state, invite.makerUserId, BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw));
  debitUser(state, invite.takerUserId, BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw));
  writeFixtureState(state);
}

function saveSession(state: FixtureState, user: FixtureUser): AuthResult {
  const token = `fixture:${user.id}:${Date.now()}`;
  state.sessions[token] = user.id;
  writeFixtureState(state);
  return { token, user: toUserView(user) };
}

function requireFixtureUser(token: string): { state: FixtureState; user: FixtureUser } {
  const state = readFixtureState();
  const userId = state.sessions[token];
  const user = state.users.find((item) => item.id === userId);
  if (!user) throw new ApiError('UNAUTHENTICATED');
  return { state, user };
}

function normalizeFixtureEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new ApiError('INVALID_EMAIL');
  return normalized;
}

function toUserView(user: FixtureUser): UserView {
  return { id: user.id, displayIdentifier: user.email };
}

function fixtureAddressFor(email: string): Hex {
  return email.includes('taker') || email.includes('opponent')
    ? '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    : '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
}

function balanceForUser(user: FixtureUser): BalanceView {
  if (!user.wallet) throw new ApiError('WALLET_NOT_LINKED');
  return {
    wallet: user.wallet.address,
    token: fixtureTokenAddress,
    symbol: 'BRL1',
    decimals: 18,
    balanceRaw: user.balanceRaw,
    allowanceRaw: '0',
    permitNonce: '0',
    spender: fixtureSpender,
  };
}

function findFixtureInvite(state: FixtureState, inviteId: string): FixtureInvite {
  const invite = state.invites.find((item) => item.id === inviteId);
  if (!invite) throw new ApiError('INVITE_NOT_FOUND');
  return normalizeFixtureInvite(invite);
}

function normalizeFixtureInvite(invite: FixtureInvite, viewerEmail?: string | null): FixtureInvite {
  const recipientEmail = invite.recipientEmail ?? null;
  invite.recipientEmail = recipientEmail;
  invite.isRecipientRestricted = Boolean(recipientEmail);
  invite.recipientEmailHint = recipientEmail ? maskFixtureEmail(recipientEmail) : null;
  invite.recipientAccess = !recipientEmail
    ? 'open'
    : !viewerEmail
      ? 'unknown'
      : viewerEmail === recipientEmail
        ? 'allowed'
        : 'blocked';
  return invite;
}

function maskFixtureEmail(email: string): string {
  const [local, domain] = email.split('@');
  return local && domain ? `${local.slice(0, 1)}***@${domain}` : '';
}

function debitUser(state: FixtureState, userId: string | null, amount: bigint): void {
  const user = state.users.find((item) => item.id === userId);
  if (user) user.balanceRaw = (BigInt(user.balanceRaw) - amount).toString();
}

function typedPayload(primaryType: string, message: Record<string, unknown>): TypedPayload {
  return {
    domain: { name: 'DuellyBetEscrowBRL1', version: '1', chainId: 137, verifyingContract: fixtureSpender },
    types: { [primaryType]: [] },
    primaryType,
    message,
  };
}

function permitPayload(owner: Hex, value: string): TypedPayload {
  return {
    domain: { name: 'Mock BRL1', version: '1', chainId: 137, verifyingContract: fixtureTokenAddress },
    types: { Permit: [] },
    primaryType: 'Permit',
    message: { owner, spender: fixtureSpender, value, nonce: '0', deadline: String(Math.floor(Date.now() / 1000) + 3600) },
  };
}
