import { useState } from 'react';
import { CircleAlert, ShieldCheck, Wallet } from 'lucide-react';
import type { FundingReadinessView } from '../lib/types';
import { errorMessage } from '../lib/errors';
import { formatBRL, shortAddress } from '../lib/format';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { Button, Card, ConfirmDialog, Skeleton } from './ui';
import { ErrorBanner } from './ErrorBanner';

/**
 * Wallet state surface. Shows a connect prompt when no wallet is linked,
 * otherwise the balance card with optional bet-readiness details.
 *
 * The `compact` variant (used inside the bet flow) drops the balance hero
 * and the Unlink action, keeping only a small readiness strip so the user
 * cannot accidentally unlink mid-bet.
 */
export function WalletReadinessCard({
  readiness,
  compact = false,
}: {
  readiness?: FundingReadinessView | null;
  compact?: boolean;
}) {
  const { locale, t } = useI18n();
  const wallet = useAppStore((state) => state.wallet);
  const balance = useAppStore((state) => state.balance);
  const balanceLoaded = useAppStore((state) => state.balanceLoaded);
  const loading = useAppStore((state) => state.loading);
  const verifyWallet = useAppStore((state) => state.verifyWallet);
  const unlinkWallet = useAppStore((state) => state.unlinkWallet);
  const [error, setError] = useState<unknown | null>(null);
  const [unlinkOpen, setUnlinkOpen] = useState(false);

  if (!wallet) {
    return (
      <Card tone="brand" padding="lg">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600">
            <Wallet size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
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

  // Compact strip used inside the bet flow — balance + readiness only.
  if (compact) {
    const ready = readiness?.canAttemptBet ?? true;
    return (
      <Card padding="md" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Wallet size={14} aria-hidden="true" className="shrink-0" />
            {t('wallet.balance')}
          </span>
          {balanceLoaded ? (
            <span className="shrink-0 text-sm font-bold text-slate-950">
              {balance ? formatBRL(balance.balanceRaw, locale, balance.decimals) : formatBRL('0', locale)}
            </span>
          ) : (
            <Skeleton variant="line" width="84px" />
          )}
        </div>
        {readiness ? (
          <div
            className={`flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold ${
              ready ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
            }`}
          >
            {ready ? (
              <ShieldCheck size={14} aria-hidden="true" className="mt-px shrink-0" />
            ) : (
              <CircleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
            )}
            <span className="min-w-0">
              {ready ? t('wallet.compactReady') : t('wallet.compactMissing')}
            </span>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-brand">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
          <Wallet size={14} aria-hidden="true" className="shrink-0" />
          {t('wallet.balance')}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
          <ShieldCheck size={11} aria-hidden="true" />
          {t('wallet.connected')}
        </span>
      </div>
      {balanceLoaded ? (
        <p className="mb-1 text-3xl font-bold tracking-tight">
          {balance
            ? formatBRL(balance.balanceRaw, locale, balance.decimals)
            : formatBRL('0', locale)}
        </p>
      ) : (
        <Skeleton variant="line" className="mb-2 h-9 opacity-70" width="150px" />
      )}
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
          <div className="flex justify-between gap-3">
            <span className="text-white/80">{t('wallet.required')}</span>
            <b className="shrink-0">{formatBRL(readiness.requiredAmountRaw, locale)}</b>
          </div>
          {!readiness.canAttemptBet ? (
            <div className="mt-1 flex justify-between gap-3 text-warning-100">
              <span>{t('wallet.missing')}</span>
              <b className="shrink-0">{formatBRL(readiness.missingAmountRaw, locale)}</b>
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
          setUnlinkOpen(true);
        }}
        className="mt-4 w-full rounded-2xl bg-white/15 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25 disabled:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {t('wallet.unlink')}
      </button>

      <ConfirmDialog
        open={unlinkOpen}
        title={t('wallet.unlinkConfirmTitle')}
        description={t('wallet.unlinkConfirmBody')}
        confirmLabel={t('wallet.unlink')}
        cancelLabel={t('common.cancel')}
        loading={loading}
        onConfirm={() => {
          void unlinkWallet()
            .then(() => setUnlinkOpen(false))
            .catch((cause) => {
              setError(cause);
              setUnlinkOpen(false);
            });
        }}
        onCancel={() => setUnlinkOpen(false)}
      />
    </section>
  );
}
