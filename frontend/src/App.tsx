import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Compass,
  Handshake,
  Home,
  LoaderCircle,
  Lock,
  Mail,
  Shield,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import { api } from './lib/api';
import { errorMessage } from './lib/errors';
import { brlToRaw, formatBRL, formatDateTime, potentialPayoutRaw, shortAddress } from './lib/format';
import { locales, translate } from './lib/i18n';
import { deriveBetStatus } from './lib/mappers';
import type { BetStatus, FeeQuoteView, FundingReadinessView, InviteView, PendingInviteView, TemplateView } from './lib/types';
import { createWalletAdapter } from './lib/wallet';
import { useAppStore } from './store/useAppStore';

const stakeOptions = [25, 50, 100, 250];

function useI18n() {
  const locale = useAppStore((state) => state.locale);
  return { locale, t: (key: string, params?: Record<string, string | number>) => translate(locale, key, params) };
}

function App() {
  return (
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  );
}

function AppBootstrap() {
  const bootstrap = useAppStore((state) => state.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/home" element={<Protected><Shell><HomeScreen /></Shell></Protected>} />
      <Route path="/templates" element={<Protected><Shell><TemplatesScreen /></Shell></Protected>} />
      <Route path="/templates/:id" element={<Protected><Shell><TemplateDetailScreen /></Shell></Protected>} />
      <Route path="/create-invite" element={<Protected><Shell><CreateInviteScreen /></Shell></Protected>} />
      <Route path="/invite/:id" element={<Protected><Shell><AcceptInviteScreen /></Shell></Protected>} />
      <Route path="/bets" element={<Protected><Shell><BetsListScreen /></Shell></Protected>} />
      <Route path="/bets/:id" element={<Protected><Shell><BetDetailScreen /></Shell></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const token = useAppStore((state) => state.token);
  const location = useLocation();
  if (!token) return <Navigate to={`/?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  return children;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto min-h-screen max-w-md px-5 pb-24">
        <div className="flex justify-end pt-4">
          <LanguageToggle />
        </div>
        {children}
      </main>
      <PendingInvitePrompt />
      <BottomNav />
    </div>
  );
}

function LanguageToggle() {
  const { locale, t } = useI18n();
  const setLocale = useAppStore((state) => state.setLocale);
  return (
    <div className="flex rounded-full border border-slate-200 bg-white p-1">
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${locale === item ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
        >
          {t(`locale.${item}`)}
        </button>
      ))}
    </div>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tabs = [
    { path: '/home', label: t('app.name'), icon: Home },
    { path: '/templates', label: t('home.explore'), icon: Compass },
    { path: '/bets', label: t('home.myBets'), icon: Handshake },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active = window.location.pathname === tab.path || (tab.path !== '/home' && window.location.pathname.startsWith(tab.path));
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function PendingInvitePrompt() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const pendingInvites = useAppStore((state) => state.pendingInvites);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const invite = pendingInvites.find((item) => !dismissed.includes(item.invite.id));
  if (!invite) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 px-5">
      <div className="mx-auto max-w-md rounded-3xl border border-blue-100 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Handshake size={18} /></div>
          <div>
            <h2 className="text-base font-bold text-slate-950">{t('invite.newTitle')}</h2>
            <p className="text-xs leading-relaxed text-slate-500">{invite.template?.title ?? t('invite.newBody')}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{formatBRL(invite.invite.stakeRaw, locale)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDismissed((items) => [...items, invite.invite.id])}
            className="rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-500"
          >
            {t('invite.dismiss')}
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed((items) => [...items, invite.invite.id]);
              navigate(`/invite/${invite.invite.id}`);
            }}
            className="rounded-2xl bg-blue-600 py-2.5 text-sm font-semibold text-white"
          >
            {t('invite.review')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Onboarding() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAppStore((state) => state.login);
  const loading = useAppStore((state) => state.loading);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password, mode === 'register');
      navigate(safeReturnTo(params.get('returnTo')) ?? '/home', { replace: true });
    } catch (error) {
      setError(error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white px-8 py-6">
      <div className="flex justify-end"><LanguageToggle /></div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Zap size={28} />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-950">{t('app.name')}</h1>
        <p className="mb-8 max-w-xs text-center text-base leading-relaxed text-slate-500">{t('auth.headline')}</p>
        <p className="mb-8 max-w-xs text-center text-sm leading-relaxed text-slate-500">{t('auth.subhead')}</p>

        <form onSubmit={submit} className="w-full max-w-xs space-y-3">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {(['login', 'register'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-xl py-2 text-sm font-semibold ${mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
              >
                {t(`auth.mode.${item}`)}
              </button>
            ))}
          </div>
          <Field icon={<Mail size={16} />} label={t('auth.email')}>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="w-full bg-transparent text-sm outline-none"
            />
          </Field>
          <Field icon={<Lock size={16} />} label={t('auth.password')}>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-transparent text-sm outline-none"
            />
          </Field>
          <p className="text-xs text-slate-400">{t('auth.passwordHelp')}</p>
          {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading && <LoaderCircle size={18} className="animate-spin" />}
            {mode === 'register' ? t('auth.register') : t('auth.enter')}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-slate-500 focus-within:border-blue-500">
        {icon}
        {children}
      </span>
    </label>
  );
}

function HomeScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const bets = useAppStore((state) => state.bets);
  const pendingInvites = useAppStore((state) => state.pendingInvites);
  const logout = useAppStore((state) => state.logout);
  const activeBets = bets.filter((bet) => ['InviteCreated', 'Accepted', 'FundingSubmitted', 'Funded'].includes(deriveBetStatus(bet)));

  return (
    <Page>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{t('home.hello')},</p>
          <h1 className="text-2xl font-bold text-slate-950">{user?.displayIdentifier}</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button type="button" onClick={() => void logout()} className="text-xs font-semibold text-slate-500">{t('common.logout')}</button>
        </div>
      </div>
      <WalletReadinessCard />
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon={<Compass size={18} />} title={t('home.explore')} onClick={() => navigate('/templates')} />
        <ActionCard icon={<Handshake size={18} />} title={t('home.myBets')} onClick={() => navigate('/bets')} />
      </div>
      {pendingInvites.length > 0 ? <PendingInvitesSection invites={pendingInvites} /> : null}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">{t('home.activeBets')}</h2>
          <button type="button" onClick={() => navigate('/bets')} className="text-xs font-semibold text-blue-600">{t('common.all')}</button>
        </div>
        {activeBets.length === 0 ? (
          <EmptyCard title={t('home.noActiveBets')} action={t('home.startWithTemplates')} onClick={() => navigate('/templates')} />
        ) : (
          <div className="space-y-3">{activeBets.slice(0, 3).map((bet) => <BetCard key={bet.invite.id} bet={bet} />)}</div>
        )}
      </section>
    </Page>
  );
}

function WalletReadinessCard({ readiness }: { readiness?: FundingReadinessView | null }) {
  const { locale, t } = useI18n();
  const wallet = useAppStore((state) => state.wallet);
  const balance = useAppStore((state) => state.balance);
  const loading = useAppStore((state) => state.loading);
  const verifyWallet = useAppStore((state) => state.verifyWallet);
  const [error, setError] = useState<unknown | null>(null);

  if (!wallet) {
    return (
      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600"><Wallet size={20} /></div>
          <div>
            <h2 className="font-semibold text-slate-950">{t('wallet.notLinked')}</h2>
            <p className="text-xs text-slate-500">{t('wallet.notLinkedBody')}</p>
          </div>
        </div>
        {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void verifyWallet().catch((error) => setError(error))}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:bg-blue-300"
        >
          {loading && <LoaderCircle size={16} className="animate-spin" />}
          {t('wallet.connect')}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
          <Wallet size={14} />
          {t('wallet.balance')}
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{t('wallet.connected')}</span>
      </div>
      <p className="mb-1 text-3xl font-bold">{balance ? formatBRL(balance.balanceRaw, locale, balance.decimals) : formatBRL('0', locale)}</p>
      <p className="mb-4 text-xs text-white/65">{shortAddress(wallet.address)}</p>
      <p className="rounded-2xl bg-white/10 p-3 text-xs leading-relaxed text-white/80">{t('home.walletFirstBody')}</p>
      {readiness && (
        <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">
          <div className="flex justify-between"><span>{t('wallet.required')}</span><b>{formatBRL(readiness.requiredAmountRaw, locale)}</b></div>
          {!readiness.canAttemptBet && <div className="mt-1 flex justify-between text-amber-100"><span>{t('wallet.missing')}</span><b>{formatBRL(readiness.missingAmountRaw, locale)}</b></div>}
          <p className="mt-2 text-xs text-white/75">{t(readiness.canAttemptBet ? 'wallet.readiness.ready' : 'wallet.readiness.missing')}</p>
        </div>
      )}
    </section>
  );
}

function ActionCard({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
    </button>
  );
}

function PendingInvitesSection({ invites }: { invites: PendingInviteView[] }) {
  const { t } = useI18n();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">{t('home.pendingInvites')}</h2>
      </div>
      <div className="space-y-3">{invites.map((invite) => <PendingInviteCard key={invite.invite.id} pending={invite} />)}</div>
    </section>
  );
}

function PendingInviteCard({ pending }: { pending: PendingInviteView }) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/invite/${pending.invite.id}`)} className="w-full rounded-3xl border border-blue-100 bg-white p-4 text-left shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">{t('invite.newTitle')}</span>
        <span className="text-sm font-bold text-slate-950">{formatBRL(pending.invite.stakeRaw, locale)}</span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">{pending.template?.title ?? t('invite.newBody')}</p>
      <p className="mt-2 text-xs font-semibold text-blue-600">{t('invite.review')}</p>
    </button>
  );
}

function TemplatesScreen() {
  const { t } = useI18n();
  const templates = useAppStore((state) => state.templates);
  const refreshTemplates = useAppStore((state) => state.refreshTemplates);
  const [category, setCategory] = useState<'all' | TemplateView['category']>('all');
  const filtered = category === 'all' ? templates : templates.filter((template) => template.category === category);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  return (
    <Page>
      <Title icon={<Compass size={20} />} eyebrow={t('home.explore')} title={t('templates.title')} body={t('templates.subtitle')} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'football', 'tennis', 'ufc', 'f1'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === item ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            {item === 'all' ? t('common.all') : item.toUpperCase()}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyCard title={t('templates.empty')} /> : <div className="space-y-3">{filtered.map((template) => <TemplateCard key={template.id} template={template} />)}</div>}
    </Page>
  );
}

function TemplateCard({ template }: { template: TemplateView }) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/templates/${template.id}`)} className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">{template.category}</span>
        <span className="text-[10px] text-slate-400">{template.source}</span>
      </div>
      <h3 className="mb-3 text-base font-semibold leading-snug text-slate-950">{template.title}</h3>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {template.outcomes.map((outcome) => <span key={outcome} className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600">{outcome}</span>)}
      </div>
      <p className="text-xs text-slate-400">{t('templates.close')} {formatDateTime(template.bettingCloseAt, locale)}</p>
    </button>
  );
}

function TemplateDetailScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
  const templates = useAppStore((state) => state.templates);
  const template = templates.find((item) => item.id === id);
  const [outcomeIndex, setOutcomeIndex] = useState<number | null>(null);
  const [stakeRaw, setStakeRaw] = useState(brlToRaw(50));
  const [quote, setQuote] = useState<FeeQuoteView | null>(null);
  const [readiness, setReadiness] = useState<FundingReadinessView | null>(null);

  useEffect(() => {
    if (!template || !token) return;
    let active = true;
    void api.quoteLoserFee(stakeRaw, template.loserFeeBps).then(async (fee) => {
      if (!active) return;
      setQuote(fee);
      if (wallet) setReadiness(await api.getReadiness(token, stakeRaw, fee.selectedLoserFeeRaw));
    });
    return () => { active = false; };
  }, [stakeRaw, template, token, wallet]);

  if (!template) return <Page><EmptyCard title={t('templates.empty')} /></Page>;

  const canCreate = Boolean(wallet && quote && readiness?.canAttemptBet && outcomeIndex !== null);
  const createUrl = `/create-invite?templateId=${encodeURIComponent(template.id)}&outcomeIndex=${outcomeIndex ?? 0}&stakeRaw=${stakeRaw}&loserFeeRaw=${quote?.selectedLoserFeeRaw ?? '0'}`;

  return (
    <Page>
      <BackButton />
      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">{template.category}</span>
      <h1 className="text-xl font-bold leading-snug text-slate-950">{template.title}</h1>
      <section className="rounded-3xl border border-slate-100 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-500"><Shield size={14} /><span className="text-xs font-semibold">{t('template.rules')}</span></div>
        <p className="text-sm leading-relaxed text-slate-600">{template.rulesSummary}</p>
        <p className="mt-3 text-xs text-slate-400">{t('templates.resolve')} {formatDateTime(template.resolutionDeadline, locale)}</p>
      </section>
      <section className="rounded-3xl border border-slate-100 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-950">{t('templates.pickSide')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {template.outcomes.map((outcome, index) => (
            <button
              key={outcome}
              type="button"
              onClick={() => setOutcomeIndex(template.outcomeIndexes[index])}
              className={`rounded-2xl border-2 p-4 text-sm font-semibold ${outcomeIndex === template.outcomeIndexes[index] ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-600'}`}
            >
              {outcome}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-100 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-950">{t('template.amountQuestion')}</h2>
        <div className="grid grid-cols-4 gap-2">
          {stakeOptions.map((amount) => (
            <button key={amount} type="button" onClick={() => setStakeRaw(brlToRaw(amount))} className={`rounded-xl py-2 text-sm font-semibold ${stakeRaw === brlToRaw(amount) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {formatBRL(brlToRaw(amount), locale)}
            </button>
          ))}
        </div>
      </section>
      {quote && <AmountBreakdown quote={quote} />}
      <WalletReadinessCard readiness={readiness} />
      <button
        type="button"
        disabled={!canCreate}
        onClick={() => navigate(createUrl)}
        className="w-full rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white disabled:bg-slate-300"
      >
        {t('template.create')}
      </button>
    </Page>
  );
}

function CreateInviteScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useAppStore((state) => state.token);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const refreshPendingInvites = useAppStore((state) => state.refreshPendingInvites);
  const templates = useAppStore((state) => state.templates);
  const template = templates.find((item) => item.id === params.get('templateId'));
  const outcomeIndex = Number(params.get('outcomeIndex') ?? 0);
  const stakeRaw = params.get('stakeRaw') ?? '0';
  const loserFeeRaw = params.get('loserFeeRaw') ?? '0';
  const [step, setStep] = useState<'review' | 'done'>('review');
  const [inviteMode, setInviteMode] = useState<'email' | 'link'>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [createdRecipientEmail, setCreatedRecipientEmail] = useState<string | null>(null);
  const [createState, setCreateState] = useState<'idle' | 'creating' | 'signing'>('idle');
  const [createdInvite, setCreatedInvite] = useState<InviteView | null>(null);
  const [error, setError] = useState<unknown | null>(null);

  if (!template || !token) return <Page><EmptyCard title={t('templates.empty')} /></Page>;

  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const requiresEmail = inviteMode === 'email';
  const recipientReady = !requiresEmail || isValidEmail(normalizedRecipient);
  const busy = createState !== 'idle';
  const buttonLabel = createState === 'creating'
    ? t('invite.creating')
    : createState === 'signing'
      ? t('invite.signing')
      : t('invite.signOffer');

  const create = async (reject = false) => {
    if (!recipientReady || busy) return;
    setError(null);
    try {
      if (reject) throw new Error('USER_REJECTED');
      setCreateState('creating');
      const adapter = createWalletAdapter(api.mode);
      const address = await adapter.connect();
      const invite = await api.createInvite(token, {
        templateId: template.id,
        stakeRaw,
        loserFeeRaw,
        makerOutcomeIndex: outcomeIndex,
        recipientEmail: requiresEmail ? normalizedRecipient : undefined,
      });
      setCreateState('signing');
      const offerSignature = await adapter.signTypedData(address, invite.offerPayload);
      const makerPermit = await adapter.signPermit(address, invite.makerPermitPayload);
      const authorized = await api.authorizeMaker(token, invite.invite.id, offerSignature, makerPermit);
      setCreatedInvite(authorized.invite);
      setCreatedRecipientEmail(requiresEmail ? normalizedRecipient : null);
      await Promise.all([refreshBets(), refreshPendingInvites()]);
      setStep('done');
    } catch (error) {
      setError(error);
    } finally {
      setCreateState('idle');
    }
  };

  return (
    <Page>
      {step === 'review' ? (
        <>
          <BackButton />
          <h1 className="text-xl font-bold text-slate-950">{t('invite.confirmTitle')}</h1>
          <section className="rounded-3xl border border-slate-100 bg-white p-4">
            <p className="mb-1 text-xs text-slate-400">{t('templates.pickSide')}</p>
            <p className="mb-3 text-base font-semibold text-blue-600">{template.outcomes[template.outcomeIndexes.indexOf(outcomeIndex)]}</p>
            <p className="text-sm leading-relaxed text-slate-600">{template.title}</p>
          </section>
          <AmountBreakdown quote={{ stakeRaw, loserFeeBps: template.loserFeeBps, percentFeeRaw: loserFeeRaw, gasAnchoredMinimumRaw: '0', selectedLoserFeeRaw: loserFeeRaw, totalRequiredAmountRaw: (BigInt(stakeRaw) + BigInt(loserFeeRaw)).toString() }} />
          <section className="rounded-3xl border border-slate-100 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-950">{t('invite.opponent')}</p>
            <div className="mb-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              {(['email', 'link'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInviteMode(item)}
                  className={`rounded-xl py-2 text-xs font-semibold ${inviteMode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                >
                  {t(`invite.mode.${item}`)}
                </button>
              ))}
            </div>
            {requiresEmail ? (
              <div className="space-y-2">
                <Field icon={<Mail size={16} />} label={t('invite.recipientEmail')}>
                  <input
                    value={recipientEmail}
                    onChange={(event) => setRecipientEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </Field>
                <p className={`text-xs ${recipientEmail && !recipientReady ? 'text-red-500' : 'text-slate-400'}`}>
                  {recipientEmail && !recipientReady ? t('invite.emailRequired') : t('invite.recipientHelp')}
                </p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-400">{t('invite.linkHelp')}</p>
            )}
          </section>
          {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}
          <button type="button" disabled={!recipientReady || busy} onClick={() => void create()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white disabled:bg-blue-300">
            {busy && <LoaderCircle size={18} className="animate-spin" />}
            {buttonLabel}
          </button>
          {api.mode === 'fixture' && <button type="button" disabled={busy} onClick={() => void create(true)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 disabled:text-slate-300">{t('common.cancel')}</button>}
        </>
      ) : (
        <SuccessState
          title={t('invite.created')}
          body={createdRecipientEmail ? t('invite.shareEmail', { email: createdRecipientEmail }) : t('invite.share')}
          action={t('invite.viewBet')}
          onAction={() => navigate('/bets')}
        >
          <InviteLink inviteId={createdInvite?.id ?? ''} />
        </SuccessState>
      )}
    </Page>
  );
}

function AcceptInviteScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const refreshPendingInvites = useAppStore((state) => state.refreshPendingInvites);
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [template, setTemplate] = useState<TemplateView | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [doneBetId, setDoneBetId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    void api.getInvite(id, token).then((result) => {
      setInvite(result?.invite ?? null);
      setTemplate(result?.template ?? null);
    });
  }, [id, token]);

  if (!id || !invite || !template) return <Page><EmptyCard title={t('invite.notFound')} /></Page>;

  const takerOutcomeIndex = template.outcomeIndexes.find((index) => index !== invite.makerOutcomeIndex) ?? template.outcomeIndexes[1];
  const takerOutcome = template.outcomes[template.outcomeIndexes.indexOf(takerOutcomeIndex)];

  const accept = async (reject = false) => {
    if (!token || !wallet || accepting || invite.recipientAccess === 'blocked') return;
    setError(null);
    try {
      if (reject) throw new Error('USER_REJECTED');
      setAccepting(true);
      const adapter = createWalletAdapter(api.mode);
      const accepted = await api.acceptInvite(token, invite.id, takerOutcomeIndex);
      const acceptanceSignature = await adapter.signTypedData(wallet.address, accepted.acceptancePayload);
      const takerPermit = await adapter.signPermit(wallet.address, accepted.takerPermitPayload);
      const authorized = await api.authorizeTaker(token, invite.id, acceptanceSignature, takerPermit);
      await Promise.all([refreshBets(), refreshPendingInvites()]);
      setDoneBetId(authorized.funding.betId);
    } catch (error) {
      setError(error);
    } finally {
      setAccepting(false);
    }
  };

  if (doneBetId) {
    return (
      <Page>
        <SuccessState title={t('invite.accepted')} body={t('invite.funded')} action={t('invite.viewBet')} onAction={() => navigate(`/bets/${doneBetId}`)} />
      </Page>
    );
  }

  return (
    <Page>
      <BackButton fallback="/home" />
      <h1 className="text-xl font-bold text-slate-950">{t('invite.acceptTitle')}</h1>
      <section className="rounded-3xl border border-slate-100 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-950">{template.title}</p>
        <div className="grid grid-cols-2 gap-3">
          <SideBox label="A" value={template.outcomes[template.outcomeIndexes.indexOf(invite.makerOutcomeIndex)]} muted />
          <SideBox label="B" value={takerOutcome} />
        </div>
      </section>
      <AmountBreakdown quote={{ stakeRaw: invite.stakeRaw, loserFeeBps: template.loserFeeBps, percentFeeRaw: invite.loserFeeRaw, gasAnchoredMinimumRaw: '0', selectedLoserFeeRaw: invite.loserFeeRaw, totalRequiredAmountRaw: (BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw)).toString() }} />
      {invite.isRecipientRestricted && invite.recipientEmailHint ? (
        <p className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">{t('invite.restrictedTo', { email: invite.recipientEmailHint })}</p>
      ) : null}
      {!wallet && <WalletReadinessCard />}
      {invite.recipientAccess === 'blocked' ? <ErrorBanner message={t('invite.blocked')} /> : null}
      {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}
      <button type="button" disabled={!wallet || accepting || invite.recipientAccess === 'blocked'} onClick={() => void accept()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3.5 text-base font-semibold text-white disabled:bg-slate-300">
        {accepting && <LoaderCircle size={18} className="animate-spin" />}
        {t('invite.accept')}
      </button>
      {api.mode === 'fixture' && <button type="button" disabled={accepting} onClick={() => void accept(true)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 disabled:text-slate-300">{t('common.cancel')}</button>}
    </Page>
  );
}

function BetsListScreen() {
  const { t } = useI18n();
  const bets = useAppStore((state) => state.bets);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const [tab, setTab] = useState<'active' | 'finished'>('active');

  useEffect(() => {
    void refreshBets();
  }, [refreshBets]);

  const active = bets.filter((bet) => ['InviteCreated', 'Accepted', 'FundingSubmitted', 'Funded'].includes(deriveBetStatus(bet)));
  const finished = bets.filter((bet) => ['Resolved', 'Voided', 'Expired'].includes(deriveBetStatus(bet)));
  const displayed = tab === 'active' ? active : finished;

  return (
    <Page>
      <Title icon={<Handshake size={20} />} eyebrow={t('home.myBets')} title={t('bets.title')} />
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <button type="button" onClick={() => setTab('active')} className={`rounded-xl py-2 text-sm font-semibold ${tab === 'active' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{t('bets.active')} ({active.length})</button>
        <button type="button" onClick={() => setTab('finished')} className={`rounded-xl py-2 text-sm font-semibold ${tab === 'finished' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{t('bets.finished')} ({finished.length})</button>
      </div>
      {displayed.length === 0 ? <EmptyCard title={tab === 'active' ? t('bets.emptyActive') : t('bets.emptyFinished')} /> : <div className="space-y-3">{displayed.map((bet) => <BetCard key={bet.invite.id} bet={bet} />)}</div>}
    </Page>
  );
}

function BetDetailScreen() {
  const { locale, t } = useI18n();
  const { id } = useParams();
  const refreshBets = useAppStore((state) => state.refreshBets);
  const bets = useAppStore((state) => state.bets);
  const [remoteBet, setRemoteBet] = useState<Awaited<ReturnType<typeof api.getBet>>>(null);
  const summary = bets.find((item) => item.invite.id === id || item.invite.betId === id || item.bet?.betId === id);
  const bet = summary?.bet ?? remoteBet;
  const template = summary?.template;
  const status = summary ? deriveBetStatus(summary) : bet?.status;

  useEffect(() => {
    if (!id) return;
    void api.getBet(id).then(setRemoteBet).catch(() => undefined);
  }, [id]);

  if (!status || !template) return <Page><BackButton /><EmptyCard title={t('bets.emptyActive')} /></Page>;

  const resolve = async (outcome: 'a' | 'b' | 'void') => {
    if (!bet) return;
    await api.resolveFixtureBet(bet.betId, outcome);
    await refreshBets();
    setRemoteBet(await api.getBet(bet.betId));
  };

  return (
    <Page>
      <BackButton />
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-950">{t('bet.detail')}</h1>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{template.title}</p>
      <section className="rounded-3xl border border-slate-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-950">{t('bet.players')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <SideBox label="A" value={template.outcomes[template.outcomeIndexes.indexOf(summary?.invite.makerOutcomeIndex ?? bet?.playerAOutcomeIndex ?? 0)]} />
          <SideBox label="B" value={template.outcomes[template.outcomeIndexes.indexOf(summary?.invite.takerOutcomeIndex ?? bet?.playerBOutcomeIndex ?? 1)] ?? '-'} />
        </div>
      </section>
      <AmountBreakdown quote={{ stakeRaw: summary?.invite.stakeRaw ?? bet?.stakeRaw ?? '0', loserFeeBps: template.loserFeeBps, percentFeeRaw: summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0', gasAnchoredMinimumRaw: '0', selectedLoserFeeRaw: summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0', totalRequiredAmountRaw: (BigInt(summary?.invite.stakeRaw ?? bet?.stakeRaw ?? '0') + BigInt(summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0')).toString() }} />
      {status === 'InviteCreated' && summary && <InviteLink inviteId={summary.invite.id} />}
      {bet?.status === 'Resolved' && (
        <section className="rounded-3xl bg-green-50 p-5 text-center">
          <Trophy className="mx-auto mb-2 text-green-600" size={28} />
          <p className="text-sm font-semibold text-green-700">{t('bet.result.winner')}</p>
          <p className="mb-3 text-lg font-bold text-green-900">{bet.winner ? shortAddress(bet.winner) : '-'}</p>
          <p className="text-sm text-green-700">{t('bet.result.payout')}: {formatBRL(bet.winnerPayoutRaw ?? '0', locale)}</p>
          <p className="text-xs text-green-600">{t('bet.result.fee')}: {formatBRL(bet.treasuryPayoutRaw ?? '0', locale)}</p>
        </section>
      )}
      {bet?.status === 'Voided' && (
        <section className="rounded-3xl bg-slate-100 p-5 text-center">
          <p className="text-lg font-bold text-slate-700">{t('bet.status.Voided')}</p>
          <p className="text-sm text-slate-500">{t('bet.result.refund')}: {formatBRL((BigInt(bet.stakeRaw) + BigInt(bet.loserFeeRaw)).toString(), locale)}</p>
        </section>
      )}
      {api.mode === 'fixture' && bet?.status === 'Funded' && (
        <section className="space-y-2 rounded-3xl border border-slate-100 bg-white p-4">
          <button type="button" onClick={() => void resolve('a')} className="w-full rounded-xl bg-blue-50 py-3 text-sm font-semibold text-blue-700">{t('bet.qa.resolveA')}</button>
          <button type="button" onClick={() => void resolve('b')} className="w-full rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">{t('bet.qa.resolveB')}</button>
          <button type="button" onClick={() => void resolve('void')} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700">{t('bet.qa.void')}</button>
        </section>
      )}
    </Page>
  );
}

function AmountBreakdown({ quote }: { quote: FeeQuoteView }) {
  const { locale, t } = useI18n();
  const rows = [
    [t('fee.stake'), quote.stakeRaw],
    [t('fee.service'), quote.selectedLoserFeeRaw],
    [t('fee.total'), quote.totalRequiredAmountRaw],
    [t('fee.payout'), potentialPayoutRaw(quote.stakeRaw, quote.selectedLoserFeeRaw)],
  ];
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4">
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-950">{formatBRL(value, locale)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BetCard({ bet }: { bet: ReturnType<typeof useAppStore.getState>['bets'][number] }) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const status = deriveBetStatus(bet);
  const stake = bet.invite.stakeRaw;
  return (
    <button type="button" onClick={() => navigate(`/bets/${bet.bet?.betId ?? bet.invite.id}`)} className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <StatusBadge status={status} />
        <span className="text-sm font-bold text-slate-950">{formatBRL(stake, locale)}</span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">{bet.template?.title}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: BetStatus }) {
  const { t } = useI18n();
  const color = status === 'Resolved' ? 'bg-green-50 text-green-700' : status === 'Voided' || status === 'Expired' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${color}`}>{t(`bet.status.${status}`)}</span>;
}

function InviteLink({ inviteId }: { inviteId: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const value = `${window.location.origin}/invite/${inviteId}`;
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4">
      <p className="mb-2 text-xs font-semibold text-slate-400">{t('invite.link')}</p>
      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-xs text-slate-700">{value}</span>
        <button type="button" onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))} className="text-slate-400">
          {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Clipboard size={18} />}
        </button>
      </div>
    </section>
  );
}

function SideBox({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${muted ? 'bg-slate-50 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function BackButton({ fallback }: { fallback?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => fallback ? navigate(fallback) : navigate(-1)} className="flex items-center gap-1 text-sm font-semibold text-slate-500">
      <ArrowLeft size={18} />
      {t('common.back')}
    </button>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-5 pt-6">
      {children}
    </motion.div>
  );
}

function Title({ icon, eyebrow, title, body }: { icon: ReactNode; eyebrow: string; title: string; body?: string }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        {body && <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>}
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
    </header>
  );
}

function EmptyCard({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {action && <button type="button" onClick={onClick} className="mt-2 text-sm font-semibold text-blue-600">{action}</button>}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div>;
}

function SuccessState({ title, body, action, onAction, children }: { title: string; body: string; action: string; onAction: () => void; children?: ReactNode }) {
  return (
    <div className="space-y-5 pt-8 text-center">
      <CheckCircle2 size={48} className="mx-auto text-green-500" />
      <div>
        <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{body}</p>
      </div>
      {children}
      <button type="button" onClick={onAction} className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white">{action}</button>
    </div>
  );
}

function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export default App;
