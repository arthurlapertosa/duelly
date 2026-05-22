import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FlaskConical, Handshake, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { formatBRL, shortAddress } from '../lib/format';
import { connectLinkedWallet } from '../lib/betHelpers';
import { deriveBetStatus, inviteHasExpired } from '../lib/mappers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { createWalletAdapter } from '../lib/wallet';
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui';
import {
  AmountBreakdown,
  ErrorBanner,
  InviteLink,
  Page,
  SideBox,
  StatusBadge,
  WalletReadinessCard,
} from '../components';
import { cn } from '../lib/cn';

/** Detail view of a single bet, including the lifecycle state and result. */
export function BetDetailScreen() {
  const { locale, t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const refreshPendingInvites = useAppStore((state) => state.refreshPendingInvites);
  const bets = useAppStore((state) => state.bets);
  const [remoteBet, setRemoteBet] = useState<Awaited<ReturnType<typeof api.getBet>>>(null);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState<unknown | null>(null);
  const summary = bets.find(
    (item) => item.invite.id === id || item.invite.betId === id || item.bet?.betId === id,
  );
  const bet = summary?.bet ?? remoteBet;
  const template = summary?.template;
  const status = summary ? deriveBetStatus(summary) : bet?.status;

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
    await refreshBets();
    setRemoteBet(await api.getBet(bet.betId));
  };

  const isInviteExpired = summary ? inviteHasExpired(summary.invite) : false;
  const showFinishAcceptance =
    summary?.role === 'taker' && summary.invite.status === 'accepted' && !bet;
  const canFinishAcceptance = showFinishAcceptance && !isInviteExpired;
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
      await Promise.all([refreshBets(), refreshPendingInvites()]);
      if (authorized.funding.betId) navigate(`/bets/${authorized.funding.betId}`, { replace: true });
    } catch (cause) {
      setActionError(cause);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Page>
      <ScreenHeader title={t('bet.detail')} back trailing={<StatusBadge status={status} />} />
      <p className="text-sm leading-relaxed text-slate-600">{template.title}</p>

      <Card padding="md">
        <h2 className="mb-3 text-sm font-semibold text-slate-950">{t('bet.players')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <SideBox
            label="A"
            value={template.outcomes[template.outcomeIndexes.indexOf(playerAOutcomeIndex)]}
            selected={selectedOutcomeIndex === playerAOutcomeIndex}
          />
          <SideBox
            label="B"
            value={template.outcomes[template.outcomeIndexes.indexOf(playerBOutcomeIndex)] ?? '-'}
            selected={selectedOutcomeIndex === playerBOutcomeIndex}
          />
        </div>
      </Card>

      <AmountBreakdown
        quote={{
          stakeRaw: summary?.invite.stakeRaw ?? bet?.stakeRaw ?? '0',
          loserFeeBps: template.loserFeeBps,
          percentFeeRaw: summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0',
          gasAnchoredMinimumRaw: '0',
          selectedLoserFeeRaw: summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0',
          totalRequiredAmountRaw: (
            BigInt(summary?.invite.stakeRaw ?? bet?.stakeRaw ?? '0') +
            BigInt(summary?.invite.loserFeeRaw ?? bet?.loserFeeRaw ?? '0')
          ).toString(),
        }}
      />

      {status === 'InviteCreated' && summary ? <InviteLink inviteId={summary.invite.id} /> : null}

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

      {bet?.status === 'Resolved' ? (
        <ResultCard
          won={currentUserWon}
          neutral={!resolvedForCurrentUser}
          winnerLabel={bet.winner ? shortAddress(bet.winner) : '-'}
          headline={
            resolvedForCurrentUser
              ? t(currentUserWon ? 'bet.result.youWon' : 'bet.result.youLost')
              : t('bet.result.winner')
          }
          payoutLabel={`${t('bet.result.payout')}: ${formatBRL(currentUserPayoutRaw, locale)}`}
          feeLabel={`${t('bet.result.fee')}: ${formatBRL(bet.treasuryPayoutRaw ?? '0', locale)}`}
        />
      ) : null}

      {bet?.status === 'Voided' ? (
        <Card tone="muted" padding="lg" className="text-center">
          <p className="text-lg font-bold text-slate-700">{t('bet.status.Voided')}</p>
          <p className="text-sm text-slate-500">
            {t('bet.result.refund')}:{' '}
            {formatBRL((BigInt(bet.stakeRaw) + BigInt(bet.loserFeeRaw)).toString(), locale)}
          </p>
        </Card>
      ) : null}

      {api.mode === 'fixture' && bet?.status === 'Funded' ? <QaResolutionControls onResolve={resolve} /> : null}
    </Page>
  );
}

function ResultCard({
  won,
  neutral,
  winnerLabel,
  headline,
  payoutLabel,
  feeLabel,
}: {
  won: boolean;
  neutral: boolean;
  winnerLabel: string;
  headline: string;
  payoutLabel: string;
  feeLabel: string;
}) {
  const positive = won || neutral;
  return (
    <section
      className={cn(
        'rounded-3xl p-5 text-center',
        positive ? 'bg-success-50' : 'bg-surface-sunken',
      )}
    >
      <Trophy
        size={28}
        className={cn('mx-auto mb-2', positive ? 'text-success-600' : 'text-slate-500')}
        aria-hidden="true"
      />
      <p className={cn('text-sm font-semibold', positive ? 'text-success-700' : 'text-slate-600')}>
        {headline}
      </p>
      <p className={cn('mb-3 text-lg font-bold', positive ? 'text-success-700' : 'text-slate-800')}>
        {winnerLabel}
      </p>
      <p className={cn('text-sm', positive ? 'text-success-700' : 'text-slate-600')}>{payoutLabel}</p>
      <p className={cn('text-xs', positive ? 'text-success-600' : 'text-slate-500')}>{feeLabel}</p>
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
