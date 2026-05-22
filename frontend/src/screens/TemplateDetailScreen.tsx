import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { brlToRaw, formatBRL, formatDateTime } from '../lib/format';
import { customStakeToRaw, stakeOptions } from '../lib/betHelpers';
import { templateDisplay } from '../lib/templateDisplay';
import { useI18n } from '../lib/useI18n';
import { useMotion } from '../lib/useMotion';
import { springSoft } from '../lib/motion';
import { useAppStore } from '../store/useAppStore';
import type { FeeQuoteView, FundingReadinessView } from '../lib/types';
import { Button, Card, EmptyState, Field, ScreenHeader, Skeleton } from '../components/ui';
import { AmountBreakdown, Page, WalletReadinessCard } from '../components';
import { cn } from '../lib/cn';

/** Template detail: pick a side, set an amount, review the bet, then create an invite. */
export function TemplateDetailScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const m = useMotion();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
  const templates = useAppStore((state) => state.templates);
  const templatesLoaded = useAppStore((state) => state.templatesLoaded);
  const refreshTemplates = useAppStore((state) => state.refreshTemplates);
  const template = templates.find((item) => item.id === id);
  const [outcomeIndex, setOutcomeIndex] = useState<number | null>(null);
  const [stakeRaw, setStakeRaw] = useState(brlToRaw(50));
  const [customStake, setCustomStake] = useState('');
  const [quote, setQuote] = useState<FeeQuoteView | null>(null);
  const [readiness, setReadiness] = useState<FundingReadinessView | null>(null);

  useEffect(() => {
    if (!templatesLoaded) void refreshTemplates();
  }, [templatesLoaded, refreshTemplates]);

  useEffect(() => {
    if (!template || !token) return;
    if (BigInt(stakeRaw) <= 0n) {
      setQuote(null);
      setReadiness(null);
      return;
    }
    let active = true;
    void api.quoteLoserFee(stakeRaw, template.loserFeeBps).then(async (fee) => {
      if (!active) return;
      setQuote(fee);
      if (wallet) setReadiness(await api.getReadiness(token, stakeRaw, fee.selectedLoserFeeRaw));
    });
    return () => {
      active = false;
    };
  }, [stakeRaw, template, token, wallet]);

  // Still loading the template list — show a skeleton, not the "not found" state.
  if (!template && !templatesLoaded) {
    return (
      <Page>
        <ScreenHeader title={t('templates.title')} back />
        <Skeleton variant="line" width="70%" height="1.5rem" />
        <Skeleton variant="block" height="6rem" />
        <Skeleton variant="block" height="8rem" />
      </Page>
    );
  }

  if (!template) {
    return (
      <Page>
        <ScreenHeader title={t('templates.title')} back />
        <EmptyState icon={<ShieldCheck size={22} aria-hidden="true" />} title={t('templates.empty')} />
      </Page>
    );
  }

  const stakeIsValid = BigInt(stakeRaw) > 0n;
  const canCreate = Boolean(wallet && quote && readiness?.canAttemptBet && outcomeIndex !== null);
  const display = templateDisplay(template, locale);
  const createUrl = `/create-invite?templateId=${encodeURIComponent(template.id)}&outcomeIndex=${
    outcomeIndex ?? 0
  }&stakeRaw=${stakeRaw}&loserFeeRaw=${quote?.selectedLoserFeeRaw ?? '0'}`;

  // Concise reason shown under a disabled "Create invite", in priority order.
  const disabledReason = canCreate
    ? null
    : outcomeIndex === null
      ? t('template.needSide')
      : !stakeIsValid
        ? t('template.needAmount')
        : !wallet
          ? t('template.needWallet')
          : readiness && !readiness.canAttemptBet
            ? t('template.needBalance')
            : null;

  const choosePresetStake = (amount: number) => {
    setCustomStake('');
    setStakeRaw(brlToRaw(amount));
  };
  const updateCustomStake = (value: string) => {
    setCustomStake(value);
    setStakeRaw(customStakeToRaw(value));
  };

  return (
    <Page>
      <ScreenHeader title={display.question} eyebrow={template.category} back />

      <Card padding="md">
        <div className="mb-2 flex items-center gap-2 text-slate-500">
          <ShieldCheck size={14} aria-hidden="true" className="shrink-0" />
          <span className="text-xs font-semibold">{t('template.rules')}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{display.rulesSummary}</p>
        <p className="mt-3 text-xs text-slate-400">
          {t('templates.resolve')} {formatDateTime(template.resolutionDeadline, locale)}
        </p>
      </Card>

      <Card padding="md">
        <h2 className="mb-3 text-base font-semibold text-slate-950">{t('templates.pickSide')}</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('templates.pickSide')}>
          {display.outcomes.map((outcome, index) => {
            const value = template.outcomeIndexes[index];
            const selected = outcomeIndex === value;
            return (
              <motion.button
                key={outcome}
                type="button"
                role="radio"
                aria-checked={selected}
                whileTap={m.tap}
                onClick={() => setOutcomeIndex(value)}
                className={cn(
                  'relative rounded-2xl border-2 p-4 text-sm font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  selected
                    ? 'border-brand-600 text-brand-700'
                    : 'border-slate-100 text-slate-600 hover:border-slate-200',
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="outcome-pick"
                    className="absolute inset-0 rounded-2xl bg-brand-50"
                    transition={m.reduced ? { duration: 0 } : springSoft}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="relative z-10 break-words">
                  {outcome}
                </span>
              </motion.button>
            );
          })}
        </div>
      </Card>

      <Card padding="md">
        <h2 className="mb-3 text-base font-semibold text-slate-950">{t('template.amountQuestion')}</h2>
        <div className="grid grid-cols-4 gap-2">
          {stakeOptions.map((amount) => {
            const selected = !customStake && stakeRaw === brlToRaw(amount);
            return (
              <motion.button
                key={amount}
                type="button"
                aria-pressed={selected}
                whileTap={m.tap}
                onClick={() => choosePresetStake(amount)}
                className={cn(
                  'relative rounded-xl py-2 text-sm font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  selected ? 'text-white' : 'bg-surface-sunken text-slate-600 hover:bg-slate-200',
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="stake-pick"
                    className="absolute inset-0 rounded-xl bg-brand-600"
                    transition={m.reduced ? { duration: 0 } : springSoft}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="relative z-10">{formatBRL(brlToRaw(amount), locale)}</span>
              </motion.button>
            );
          })}
        </div>
        <Field
          className="mt-3"
          label={t('template.customAmount')}
          prefix="R$"
          value={customStake}
          onChange={(event) => updateCustomStake(event.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          invalid={Boolean(customStake) && !stakeIsValid}
        />
      </Card>

      {quote ? <AmountBreakdown quote={quote} /> : null}
      <WalletReadinessCard readiness={readiness} compact />

      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canCreate}
          onClick={() => navigate(createUrl)}
        >
          {t('template.create')}
        </Button>
        {disabledReason ? (
          <p className="text-center text-xs font-medium text-slate-500">{disabledReason}</p>
        ) : null}
      </div>
    </Page>
  );
}
