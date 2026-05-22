import { useState } from 'react';
import { ShieldCheck, Wallet } from 'lucide-react';
import type { FundingReadinessView } from '../lib/types';
import { errorMessage } from '../lib/errors';
import { formatBRL, shortAddress } from '../lib/format';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { Button, Card } from './ui';
import { ErrorBanner } from './ErrorBanner';

/**
 * Wallet state surface. Shows a connect prompt when no wallet is linked,
 * otherwise the balance card with optional bet-readiness details.
 */
export function WalletReadinessCard({ readiness }: { readiness?: FundingReadinessView | null }) {
  const { locale, t } = useI18n();
  const wallet = useAppStore((state) => state.wallet);
  const balance = useAppStore((state) => state.balance);
  const loading = useAppStore((state) => state.loading);
  const verifyWallet = useAppStore((state) => state.verifyWallet);
  const unlinkWallet = useAppStore((state) => state.unlinkWallet);
  const [error, setError] = useState<unknown | null>(null);

  if (!wallet) {
    return (
      <Card tone="brand" padding="lg">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600">
            <Wallet size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-950">{t('wallet.notLinked')}</h2>
            <p className="text-xs leading-relaxed text-slate-500">{t('wallet.notLinkedBody')}</p>
          </div>
        </div>
        {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}
        <Button
          variant="primary"
          fullWidth
          className="mt-3"
          loading={loading}
          onClick={() => {
            setError(null);
            void verifyWallet().catch((cause) => setError(cause));
          }}
        >
          {t('wallet.connect')}
        </Button>
      </Card>
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-brand">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
          <Wallet size={14} aria-hidden="true" />
          {t('wallet.balance')}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
          <ShieldCheck size={11} aria-hidden="true" />
          {t('wallet.connected')}
        </span>
      </div>
      <p className="mb-1 text-3xl font-bold tracking-tight">
        {balance
          ? formatBRL(balance.balanceRaw, locale, balance.decimals)
          : formatBRL('0', locale)}
      </p>
      <p className="mb-4 text-xs text-white/65">{shortAddress(wallet.address)}</p>
      <p className="rounded-2xl bg-white/10 p-3 text-xs leading-relaxed text-white/85">
        {t('home.walletFirstBody')}
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorBanner message={errorMessage(locale, error)} />
        </div>
      ) : null}
      {readiness ? (
        <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/80">{t('wallet.required')}</span>
            <b>{formatBRL(readiness.requiredAmountRaw, locale)}</b>
          </div>
          {!readiness.canAttemptBet ? (
            <div className="mt-1 flex justify-between text-warning-100">
              <span>{t('wallet.missing')}</span>
              <b>{formatBRL(readiness.missingAmountRaw, locale)}</b>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-white/75">
            {t(readiness.canAttemptBet ? 'wallet.readiness.ready' : 'wallet.readiness.missing')}
          </p>
        </div>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setError(null);
          void unlinkWallet().catch((cause) => setError(cause));
        }}
        className="mt-4 w-full rounded-2xl bg-white/15 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25 disabled:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {t('wallet.unlink')}
      </button>
    </section>
  );
}
