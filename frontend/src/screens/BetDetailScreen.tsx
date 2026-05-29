import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Frown, Handshake, Loader2, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { formatBRL } from '../lib/format';
import { connectLinkedWallet } from '../lib/betHelpers';
import { templateDisplay, templateOutcomeLabel } from '../lib/templateDisplay';
import { deriveBetStatus, inviteHasExpired } from '../lib/mappers';
import { springPop } from '../lib/motion';
import { useI18n } from '../lib/useI18n';
import { useMotion } from '../lib/useMotion';
import { useAppStore } from '../store/useAppStore';
import { createWalletAdapter } from '../lib/wallet';
import { Button, Card, ConfirmDialog, EmptyState, ScreenHeader } from '../components/ui';
import {
  AmountBreakdown,
  ConfettiBurst,
  CountUpAmount,
  ErrorBanner,
  InviteLink,
  Page,
  SideBox,
  StatusBadge,
  WalletReadinessCard,
} from '../components';

/** Detail view of a single bet, including the lifecycle state and result. */
export function BetDetailScreen() {
  const { locale, t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const refreshAccountData = useAppStore((state) => state.refreshAccountData);
  const bets = useAppStore((state) => state.bets);
  const [remoteBet, setRemoteBet] = useState<Awaited<ReturnType<typeof api.getBet>>>(null);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState<unknown | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const summary = bets.find(
    (item) => item.invite.id === id || item.invite.betId === id || item.bet?.betId === id,
  );
  const bet = summary?.bet ?? remoteBet;
  const template = summary?.template;
  const status = summary ? deriveBetStatus(summary) : bet?.status;
  const activatingInviteId = summary?.invite.status === 'funding_submitted' && !bet ? summary.invite.id : null;

  useEffect(() => {
    if (!id || !token || summary) return;
    void refreshBets();
  }, [id, refreshBets, summary, token]);

  useEffect(() => {
    if (!id) return;
    if (summary) {
      if (summary.bet) setRemoteBet(summary.bet);
      else if (summary.invite.betId)
        void api.getBet(summary.invite.betId).then(setRemoteBet).catch(() => undefined);
      else setRemoteBet(null);
      return;
    }
    if (id.startsWith('invite-')) return;
    void api.getBet(id).then(setRemoteBet).catch(() => undefined);
  }, [id, summary]);

  useEffect(() => {
    if (!id || !summary?.bet || id === summary.bet.betId) return;
    navigate(`/bets/${summary.bet.betId}`, { replace: true });
  }, [id, navigate, summary?.bet]);

  useEffect(() => {
    if (!token || !activatingInviteId) return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      await refreshBets();
      const funded = await api.getBetByInvite(activatingInviteId).catch(() => null);
      if (!active || !funded) return;
      setRemoteBet(funded);
      active = false;
      await refreshAccountData({ force: true });
      navigate(`/bets/${funded.betId}`, { replace: true });
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activatingInviteId, navigate, refreshAccountData, refreshBets, token]);

  if (!status || !template) {
    return (
      <Page>
        <ScreenHeader title={t('bet.detail')} back />
        <EmptyState icon={<Handshake size={22} aria-hidden="true" />} title={t('bets.emptyActive')} />
      </Page>
    );
  }

  const resolve = async (outcome: 'a' | 'b' | 'void') => {
    if (!bet) return;
    await api.resolveFixtureBet(bet.betId, outcome);
    await refreshAccountData({ force: true });
    setRemoteBet(await api.getBet(bet.betId));
  };

  const isInviteExpired = summary ? inviteHasExpired(summary.invite) : false;
  const showFinishAcceptance =
    summary?.role === 'taker' && summary.invite.status === 'accepted' && !bet;
  const showActivating = Boolean(activatingInviteId);
  const canFinishAcceptance = showFinishAcceptance && !isInviteExpired;
  // Maker can cancel their own still-open invite before anyone accepts.
  const canCancelInvite =
    Boolean(token) && summary?.role === 'maker' && status === 'InviteCreated';
  const playerAOutcomeIndex = summary?.invite.makerOutcomeIndex ?? bet?.playerAOutcomeIndex ?? 0;
  const playerBOutcomeIndex = summary?.invite.takerOutcomeIndex ?? bet?.playerBOutcomeIndex ?? 1;
  const selectedOutcomeIndex =
    summary?.role === 'maker'
      ? playerAOutcomeIndex
      : summary?.role === 'taker'
        ? playerBOutcomeIndex
        : null;
  const winnerRole =
    bet?.winner?.toLowerCase() === bet?.playerA.toLowerCase()
      ? 'maker'
      : bet?.winner?.toLowerCase() === bet?.playerB.toLowerCase()
        ? 'taker'
        : null;
  const resolvedForCurrentUser = Boolean(summary && bet?.status === 'Resolved' && winnerRole);
  const currentUserWon = resolvedForCurrentUser && summary?.role === winnerRole;
  const currentUserPayoutRaw = resolvedForCurrentUser
    ? currentUserWon
      ? bet?.winnerPayoutRaw ?? '0'
      : '0'
    : bet?.winnerPayoutRaw ?? '0';
  const stakedRaw = summary?.invite.stakeRaw ?? bet?.stakeRaw ?? '0';
  const display = templateDisplay(template, locale);

  const finishAcceptance = async () => {
    if (!summary || !template || !token || !wallet || accepting || isInviteExpired) return;
    setActionError(null);
    try {
      setAccepting(true);
      const takerOutcomeIndex =
        summary.invite.takerOutcomeIndex ??
        template.outcomeIndexes.find((index) => index !== summary.invite.makerOutcomeIndex) ??
        template.outcomeIndexes[1];
      const adapter = createWalletAdapter(api.mode);
      const address = await connectLinkedWallet(adapter, wallet.address);
      const accepted = await api.acceptInvite(token, summary.invite.id, takerOutcomeIndex);
      const acceptanceSignature = await adapter.signTypedData(address, accepted.acceptancePayload);
      const takerPermit = await adapter.signPermit(address, accepted.takerPermitPayload);
      const authorized = await api.authorizeTaker(
        token,
        summary.invite.id,
        acceptanceSignature,
        takerPermit,
      );
      await refreshAccountData({ force: true });
      if (authorized.funding.betId) navigate(`/bets/${authorized.funding.betId}`, { replace: true });
      else navigate(`/bets/${summary.invite.id}`, { replace: true });
    } catch (cause) {
      setActionError(cause);
    } finally {
      setAccepting(false);
    }
  };

  const cancelInvite = async () => {
    if (!summary || !token || cancelling) return;
    setActionError(null);
    try {
      setCancelling(true);
      await api.cancelInvite(token, summary.invite.id);
      await refreshAccountData({ force: true });
      setCancelOpen(false);
      navigate('/bets', { replace: true });
    } catch (cause) {
      setActionError(cause);
      setCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Page>
      <ScreenHeader title={t('bet.detail')} back trailing={<StatusBadge status={status} />} />
      <p className="text-sm leading-relaxed text-slate-600">{display.question}</p>

      <Card padding="md">
        <h2 className="mb-3 text-sm font-semibold text-slate-950">{t('bet.players')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <SideBox
            label="A"
            value={templateOutcomeLabel(template, locale, playerAOutcomeIndex)}
            selected={selectedOutcomeIndex === playerAOutcomeIndex}
          />
          <SideBox
            label="B"
            value={templateOutcomeLabel(template, locale, playerBOutcomeIndex)}
            selected={selectedOutcomeIndex === playerBOutcomeIndex}
          />
        </div>
      </Card>

      <AmountBreakdown
        quote={{
          stakeRaw: stakedRaw,
          loserFeeBps: template.loserFeeBps,
          percentFeeRaw: summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0',
          gasAnchoredMinimumRaw: '0',
          selectedLoserFeeRaw: summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0',
          totalRequiredAmountRaw: (
            BigInt(stakedRaw) + BigInt(summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0')
          ).toString(),
        }}
      />

      {status === 'InviteCreated' && summary ? <InviteLink inviteId={summary.invite.id} /> : null}

      {showActivating ? (
        <Card padding="md" className="flex items-start gap-3 border-brand-100 bg-brand-50">
          <Loader2 size={20} className="mt-0.5 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-800">{t('invite.activatingTitle')}</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-700">{t('invite.activatingBody')}</p>
          </div>
        </Card>
      ) : null}

      {canCancelInvite ? (
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => setCancelOpen(true)}
        >
          {t('invite.cancel')}
        </Button>
      ) : null}

      {showFinishAcceptance ? (
        <>
          {!wallet && !isInviteExpired ? <WalletReadinessCard /> : null}
          <Card padding="md" className="space-y-3 border-success-100">
            <p className="text-sm leading-relaxed text-slate-600">
              {t('invite.finishAcceptanceBody')}
            </p>
            {isInviteExpired ? (
              <ErrorBanner message={t('error.INVITE_EXPIRED')} />
            ) : actionError ? (
              <ErrorBanner message={errorMessage(locale, actionError)} />
            ) : null}
            <Button
              variant="success"
              size="lg"
              fullWidth
              loading={accepting}
              disabled={!canFinishAcceptance || !wallet}
              onClick={() => void finishAcceptance()}
            >
              {t('invite.finishAcceptance')}
            </Button>
          </Card>
        </>
      ) : null}

      {!showFinishAcceptance && !canCancelInvite && actionError ? (
        <ErrorBanner message={errorMessage(locale, actionError)} />
      ) : null}

      {bet?.status === 'Resolved' && resolvedForCurrentUser ? (
        currentUserWon ? (
          <WinResultCard payoutRaw={currentUserPayoutRaw} />
        ) : (
          <LossResultCard stakedRaw={stakedRaw} />
        )
      ) : null}

      {bet?.status === 'Resolved' && !resolvedForCurrentUser ? (
        <Card tone="muted" padding="lg" className="text-center">
          <p className="text-lg font-bold text-slate-700">{t('bet.result.winner')}</p>
        </Card>
      ) : null}

      {bet?.status === 'Voided' ? (
        <Card tone="muted" padding="lg" className="text-center">
          <p className="text-lg font-bold text-slate-700">{t('bet.status.Voided')}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{t('bet.result.voidedBody')}</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {t('bet.result.refund')}:{' '}
            {formatBRL((BigInt(bet.stakeRaw) + BigInt(bet.loserFeeRaw)).toString(), locale)}
          </p>
        </Card>
      ) : null}

      {api.mode === 'fixture' && bet?.status === 'Funded' ? <QaResolutionControls onResolve={resolve} /> : null}

      <ConfirmDialog
        open={cancelOpen}
        title={t('invite.cancelConfirmTitle')}
        description={t('invite.cancelConfirmBody')}
        confirmLabel={t('invite.cancel')}
        cancelLabel={t('common.cancel')}
        loading={cancelling}
        onConfirm={() => void cancelInvite()}
        onCancel={() => setCancelOpen(false)}
      />
    </Page>
  );
}

/** Celebratory result card for a win — animated trophy, count-up payout, confetti. */
function WinResultCard({ payoutRaw }: { payoutRaw: string }) {
  const { locale, t } = useI18n();
  const m = useMotion();
  return (
    <section className="relative overflow-hidden rounded-3xl bg-success-50 p-6 text-center">
      <ConfettiBurst />
      <motion.div
        initial={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: -20 }}
        animate={m.reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={m.reduced ? { duration: 0.12 } : springPop}
        className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-success-100"
      >
        <Trophy size={32} className="text-success-600" aria-hidden="true" />
      </motion.div>
      <p className="relative text-sm font-bold text-success-700">{t('bet.result.youWon')}</p>
      <p className="relative mt-1 text-xs font-semibold uppercase tracking-wide text-success-600">
        {t('bet.result.received')}
      </p>
      <CountUpAmount
        raw={payoutRaw}
        locale={locale}
        className="relative mt-1 block text-3xl font-bold tracking-tight text-success-700"
      />
    </section>
  );
}

/** Result card for a loss — clear, human, leads with what was staked. */
function LossResultCard({ stakedRaw }: { stakedRaw: string }) {
  const { locale, t } = useI18n();
  return (
    <section className="rounded-3xl bg-surface-sunken p-6 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-200">
        <Frown size={32} className="text-slate-500" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-slate-700">{t('bet.result.youLost')}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{t('bet.result.lostBody')}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('bet.result.staked')}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-700">{formatBRL(stakedRaw, locale)}</p>
    </section>
  );
}

/** QA-only resolution shortcuts. Visually fenced off from product UI. */
function QaResolutionControls({ onResolve }: { onResolve: (outcome: 'a' | 'b' | 'void') => void }) {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-surface-sunken p-4">
      <div className="mb-1 flex items-center gap-1.5 text-slate-500">
        <FlaskConical size={13} aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{t('bet.qa.eyebrow')}</span>
      </div>
      <p className="mb-3 text-xs text-slate-400">{t('bet.qa.help')}</p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onResolve('a')}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('bet.qa.resolveA')}
        </button>
        <button
          type="button"
          onClick={() => onResolve('b')}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-success-700 ring-1 ring-slate-200 transition-colors hover:bg-success-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('bet.qa.resolveB')}
        </button>
        <button
          type="button"
          onClick={() => onResolve('void')}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('bet.qa.void')}
        </button>
      </div>
    </section>
  );
}
