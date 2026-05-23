import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { defaultLocale, normalizeLocale } from '../lib/i18n';
import type { BalanceView, BetSummaryView, Locale, PendingInviteView, TemplateView, UserView, WalletView } from '../lib/types';
import { createWalletAdapter } from '../lib/wallet';

interface AppStore {
  locale: Locale;
  token: string | null;
  user: UserView | null;
  wallet: WalletView | null;
  balance: BalanceView | null;
  templates: TemplateView[];
  bets: BetSummaryView[];
  pendingInvites: PendingInviteView[];
  loading: boolean;
  /** True once each collection has completed at least one fetch. Lets screens
   *  show a skeleton instead of flashing an empty state before data arrives. */
  templatesLoaded: boolean;
  betsLoaded: boolean;
  pendingInvitesLoaded: boolean;
  error: string | null;
  setLocale(locale: Locale): void;
  clearError(): void;
  bootstrap(): Promise<void>;
  login(email: string, password: string, register: boolean): Promise<void>;
  logout(): Promise<void>;
  verifyWallet(): Promise<void>;
  unlinkWallet(): Promise<void>;
  refreshBalance(): Promise<void>;
  refreshTemplates(): Promise<void>;
  upsertTemplate(template: TemplateView): void;
  upsertTemplates(templates: TemplateView[]): void;
  refreshBets(): Promise<void>;
  refreshPendingInvites(): Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      locale: defaultLocale,
      token: null,
      user: null,
      wallet: null,
      balance: null,
      templates: [],
      bets: [],
      pendingInvites: [],
      loading: false,
      templatesLoaded: false,
      betsLoaded: false,
      pendingInvitesLoaded: false,
      error: null,
      setLocale: (locale) => set({ locale }),
      clearError: () => set({ error: null }),
      bootstrap: async () => {
        const token = get().token;
        set({ locale: normalizeLocale(get().locale) });
        if (!token) return;
        try {
          const session = await api.me(token);
          set({ user: session.user, wallet: session.wallet });
          await refreshSecondaryData(get());
        } catch {
          set({
            token: null,
            user: null,
            wallet: null,
            balance: null,
            bets: [],
            pendingInvites: [],
            betsLoaded: false,
            pendingInvitesLoaded: false,
          });
        }
      },
      login: async (email, password, register) => {
        set({ loading: true, error: null });
        try {
          window.localStorage.setItem('duelly-last-email', email.toLowerCase());
          const result = register
            ? await api.register(email, password)
            : await api.login(email, password);
          set({ token: result.token, user: result.user, wallet: null, balance: null });
          const session = await api.me(result.token);
          set({ user: session.user, wallet: session.wallet });
          await refreshSecondaryData(get());
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'AUTH_FAILED' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },
      logout: async () => {
        const token = get().token;
        if (token) await api.logout(token).catch(() => undefined);
        set({
          token: null,
          user: null,
          wallet: null,
          balance: null,
          bets: [],
          pendingInvites: [],
          betsLoaded: false,
          pendingInvitesLoaded: false,
        });
      },
      verifyWallet: async () => {
        const token = get().token;
        if (!token) throw new Error('UNAUTHENTICATED');
        set({ loading: true, error: null });
        try {
          const adapter = createWalletAdapter(api.mode);
          const address = await adapter.selectAccount();
          const challenge = await api.createWalletChallenge(token, address);
          const signature = await adapter.signMessage(address, challenge.message);
          const wallet = await api.linkWallet(token, challenge.id, signature);
          set({ wallet });
          await get().refreshBalance();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'WALLET_VERIFICATION_FAILED' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },
      unlinkWallet: async () => {
        const token = get().token;
        if (!token) throw new Error('UNAUTHENTICATED');
        set({ loading: true, error: null });
        try {
          await api.unlinkWallet(token);
          set({ wallet: null, balance: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'WALLET_NOT_LINKED' });
          throw error;
        } finally {
          set({ loading: false });
        }
      },
      refreshBalance: async () => {
        const token = get().token;
        if (!token) return;
        const balance = await api.getBalance(token);
        set({ balance });
      },
      refreshTemplates: async () => {
        const result = await api.listTemplates({ limit: 25 });
        set({ templates: result.templates, templatesLoaded: true });
      },
      upsertTemplate: (template) => {
        set((state) => ({ templates: upsertTemplatesById(state.templates, [template]) }));
      },
      upsertTemplates: (templates) => {
        set((state) => ({
          templates: upsertTemplatesById(state.templates, templates),
          templatesLoaded: state.templatesLoaded || templates.length > 0,
        }));
      },
      refreshBets: async () => {
        const token = get().token;
        if (!token) return;
        const bets = await api.listMyBets(token);
        set({ bets, betsLoaded: true });
      },
      refreshPendingInvites: async () => {
        const token = get().token;
        if (!token) return;
        const pendingInvites = await api.listPendingInvites(token);
        set({ pendingInvites, pendingInvitesLoaded: true });
      },
    }),
    {
      name: 'duelly-m4-session',
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        locale: state.locale,
        token: state.token,
        user: state.user,
        wallet: state.wallet,
      }),
    },
  ),
);

function upsertTemplatesById(existing: TemplateView[], next: TemplateView[]): TemplateView[] {
  const byId = new Map(existing.map((template) => [template.id, template]));
  for (const template of next) byId.set(template.id, template);
  return [...byId.values()];
}

async function refreshSecondaryData(store: AppStore): Promise<void> {
  await Promise.allSettled([
    store.refreshBalance(),
    store.refreshBets(),
    store.refreshPendingInvites(),
  ]);
}
