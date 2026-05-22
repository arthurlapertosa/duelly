import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { connectLinkedWallet } from '../lib/betHelpers';
import { templateDisplay, templateOutcomeLabel } from '../lib/templateDisplay';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { createWalletAdapter } from '../lib/wallet';
import type { InviteView, TemplateView } from '../lib/types';
import { Button, Card, EmptyState, ScreenHeader, Skeleton } from '../components/ui';
import {
  AmountBreakdown,
  ErrorBanner,
  Page,
  SideBox,
  SuccessState,
  WalletReadinessCard,
} from '../components';

/** Taker flow: review an incoming invite, choose the opposite side, accept and fund. */
export function AcceptInviteScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const refreshPendingInvites = useAppStore((state) => state.refreshPendingInvites);
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [template, setTemplate] = useState<TemplateView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [doneBetId, setDoneBetId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    let active = true;
    void api
      .getInvite(id, token)
      .then((result) => {
        if (!active) return;
        setInvite(result?.invite ?? null);
        setTemplate(result?.template ?? null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  // Still fetching the invite — show a skeleton, not the "not found" state.
  if (!loaded && (!invite || !template)) {
    return (
      <Page>
        <ScreenHeader title={t('invite.acceptTitle')} back="/home" />
        <Skeleton variant="block" height="7rem" />
        <Skeleton variant="block" height="9rem" />
        <Skeleton variant="block" height="3rem" />
      </Page>
    );
  }

  if (!id || !invite || !template) {
    return (
      <Page>
        <ScreenHeader title={t('invite.acceptTitle')} back="/home" />
        <EmptyState icon={<Inbox size={22} aria-hidden="true" />} title={t('invite.notFound')} />
      </Page>
    );
  }

  const takerOutcomeIndex =
    template.outcomeIndexes.find((index) => index !== invite.makerOutcomeIndex) ??
    template.outcomeIndexes[1];
  const display = templateDisplay(template, locale);
  const takerOutcome = templateOutcomeLabel(template, locale, takerOutcomeIndex);
  const makerOutcome = templateOutcomeLabel(template, locale, invite.makerOutcomeIndex);
  const blocked = invite.recipientAccess === 'blocked';
  const canAccept = Boolean(wallet) && !blocked;
  // Concise reason shown under a disabled "Accept bet".
  const disabledReason = canAccept
    ? null
    : blocked
      ? t('invite.blockedHelp')
      : !wallet
        ? t('invite.needWallet')
        : null;

  const accept = async () => {
    if (!token || !wallet || accepting || blocked) return;
    setError(null);
    try {
      setAccepting(true);
      const adapter = createWalletAdapter(api.mode);
      const address = await connectLinkedWallet(adapter, wallet.address);
      const accepted = await api.acceptInvite(token, invite.id, takerOutcomeIndex);
      const acceptanceSignature = await adapter.signTypedData(address, accepted.acceptancePayload);
      const takerPermit = await adapter.signPermit(address, accepted.takerPermitPayload);
      const authorized = await api.authorizeTaker(token, invite.id, acceptanceSignature, takerPermit);
      await Promise.all([refreshBets(), refreshPendingInvites()]);
      setDoneBetId(authorized.funding.betId);
    } catch (cause) {
      setError(cause);
    } finally {
      setAccepting(false);
    }
  };

  if (doneBetId) {
    return (
      <Page>
        <SuccessState
          title={t('invite.accepted')}
          body={t('invite.funded')}
          action={t('invite.viewBet')}
          onAction={() => navigate(`/bets/${doneBetId}`)}
        />
      </Page>
    );
  }

  return (
    <Page>
      <ScreenHeader title={t('invite.acceptTitle')} back="/home" />

      <Card padding="md">
        <p className="mb-3 text-sm font-semibold text-slate-950">{display.question}</p>
        <div className="grid grid-cols-2 gap-3">
          <SideBox label="A" value={makerOutcome} muted />
          <SideBox label="B" value={takerOutcome} />
        </div>
      </Card>

      <AmountBreakdown
        quote={{
          stakeRaw: invite.stakeRaw,
          loserFeeBps: template.loserFeeBps,
          percentFeeRaw: invite.loserFeeRaw,
          gasAnchoredMinimumRaw: '0',
          selectedLoserFeeRaw: invite.loserFeeRaw,
          totalRequiredAmountRaw: (BigInt(invite.stakeRaw) + BigInt(invite.loserFeeRaw)).toString(),
        }}
      />

      {invite.isRecipientRestricted && invite.recipientEmailHint ? (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-700">
          {t('invite.restrictedTo', { email: invite.recipientEmailHint })}
        </p>
      ) : null}

      {!wallet ? <WalletReadinessCard /> : null}
      {blocked ? <ErrorBanner message={t('invite.blocked')} /> : null}
      {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}

      <div className="space-y-2">
        <Button
          variant="success"
          size="lg"
          fullWidth
          loading={accepting}
          disabled={!canAccept}
          onClick={() => void accept()}
        >
          {t('invite.accept')}
        </Button>
        {disabledReason ? (
          <p className="text-center text-xs font-medium text-slate-500">{disabledReason}</p>
        ) : null}
      </div>
    </Page>
  );
}
