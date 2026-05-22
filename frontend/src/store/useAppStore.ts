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
      error: null,
      setLocale: (locale) => set({ locale }),
      clearError: () => set({ error: null }),
      bootstrap: async () => {
        const token = get().token;
        set({ locale: normalizeLocale(get().locale) });
        await get().refreshTemplates();
        if (!token) return;
        try {
          const session = await api.me(token);
          set({ user: session.user, wallet: session.wallet });
          await Promise.all([get().refreshBalance(), get().refreshBets(), get().refreshPendingInvites()]);
        } catch {
          set({ token: null, user: null, wallet: null, balance: null, bets: [], pendingInvites: [] });
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
          await Promise.all([get().refreshBalance(), get().refreshBets(), get().refreshPendingInvites()]);
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
        set({ token: null, user: null, wallet: null, balance: null, bets: [], pendingInvites: [] });
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
        const templates = await api.listTemplates();
        set({ templates });
      },
      refreshBets: async () => {
        const token = get().token;
        if (!token) return;
        const bets = await api.listMyBets(token);
        set({ bets });
      },
      refreshPendingInvites: async () => {
        const token = get().token;
        if (!token) return;
        const pendingInvites = await api.listPendingInvites(token);
        set({ pendingInvites });
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
