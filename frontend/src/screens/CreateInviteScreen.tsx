import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { connectLinkedWallet, isValidEmail } from '../lib/betHelpers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { createWalletAdapter } from '../lib/wallet';
import type { InviteView } from '../lib/types';
import { Button, Card, EmptyState, Field, ScreenHeader, SegmentedControl } from '../components/ui';
import { AmountBreakdown, ErrorBanner, InviteLink, Page, SuccessState } from '../components';

type CreateState = 'idle' | 'creating' | 'signing';

/** Maker flow: review the bet, choose a recipient, sign and publish the invite. */
export function CreateInviteScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useAppStore((state) => state.token);
  const wallet = useAppStore((state) => state.wallet);
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
  const [createState, setCreateState] = useState<CreateState>('idle');
  const [createdInvite, setCreatedInvite] = useState<InviteView | null>(null);
  const [error, setError] = useState<unknown | null>(null);

  if (!template || !token) {
    return (
      <Page>
        <ScreenHeader title={t('invite.confirmTitle')} back />
        <EmptyState icon={<ShieldCheck size={22} aria-hidden="true" />} title={t('templates.empty')} />
      </Page>
    );
  }

  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const requiresEmail = inviteMode === 'email';
  const recipientReady = !requiresEmail || isValidEmail(normalizedRecipient);
  const emailInvalid = requiresEmail && Boolean(recipientEmail) && !recipientReady;
  const busy = createState !== 'idle';
  const buttonLabel =
    createState === 'creating'
      ? t('invite.creating')
      : createState === 'signing'
        ? t('invite.signing')
        : t('invite.signOffer');

  const create = async () => {
    if (!recipientReady || busy) return;
    setError(null);
    let draftInviteId: string | null = null;
    let makerAuthorized = false;
    try {
      setCreateState('creating');
      if (!wallet) throw new Error('WALLET_NOT_LINKED');
      const adapter = createWalletAdapter(api.mode);
      const address = await connectLinkedWallet(adapter, wallet.address);
      const invite = await api.createInvite(token, {
        templateId: template.id,
        stakeRaw,
        loserFeeRaw,
        makerOutcomeIndex: outcomeIndex,
        recipientEmail: requiresEmail ? normalizedRecipient : undefined,
      });
      draftInviteId = invite.invite.id;
      setCreateState('signing');
      const offerSignature = await adapter.signTypedData(address, invite.offerPayload);
      const makerPermit = await adapter.signPermit(address, invite.makerPermitPayload);
      const authorized = await api.authorizeMaker(token, invite.invite.id, offerSignature, makerPermit);
      makerAuthorized = true;
      setCreatedInvite(authorized.invite);
      setCreatedRecipientEmail(requiresEmail ? normalizedRecipient : null);
      await Promise.all([refreshBets(), refreshPendingInvites()]);
      setStep('done');
    } catch (cause) {
      if (draftInviteId && !makerAuthorized) {
        await api.cancelInvite(token, draftInviteId).catch(() => undefined);
        await Promise.all([refreshBets(), refreshPendingInvites()]).catch(() => undefined);
      }
      setError(cause);
    } finally {
      setCreateState('idle');
    }
  };

  if (step === 'done') {
    return (
      <Page>
        <SuccessState
          title={t('invite.created')}
          body={
            createdRecipientEmail
              ? t('invite.shareEmail', { email: createdRecipientEmail })
              : t('invite.share')
          }
          action={t('invite.viewBet')}
          onAction={() => navigate('/bets')}
        >
          <InviteLink inviteId={createdInvite?.id ?? ''} />
        </SuccessState>
      </Page>
    );
  }

  return (
    <Page>
      <ScreenHeader title={t('invite.confirmTitle')} back />

      <Card padding="md">
        <p className="mb-1 text-xs font-semibold text-slate-400">{t('templates.pickSide')}</p>
        <p className="mb-3 text-base font-semibold text-brand-600">
          {template.outcomes[template.outcomeIndexes.indexOf(outcomeIndex)]}
        </p>
        <p className="text-sm leading-relaxed text-slate-600">{template.title}</p>
      </Card>

      <AmountBreakdown
        quote={{
          stakeRaw,
          loserFeeBps: template.loserFeeBps,
          percentFeeRaw: loserFeeRaw,
          gasAnchoredMinimumRaw: '0',
          selectedLoserFeeRaw: loserFeeRaw,
          totalRequiredAmountRaw: (BigInt(stakeRaw) + BigInt(loserFeeRaw)).toString(),
        }}
      />

      <Card padding="md">
        <p className="mb-3 text-sm font-semibold text-slate-950">{t('invite.opponent')}</p>
        <SegmentedControl
          ariaLabel={t('invite.opponent')}
          size="sm"
          value={inviteMode}
          onChange={setInviteMode}
          options={[
            { value: 'email', label: t('invite.mode.email') },
            { value: 'link', label: t('invite.mode.link') },
          ]}
          className="mb-3"
        />
        {requiresEmail ? (
          <Field
            label={t('invite.recipientEmail')}
            icon={<Mail size={16} aria-hidden="true" />}
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            type="email"
            autoComplete="email"
            invalid={emailInvalid}
            hint={emailInvalid ? t('invite.emailRequired') : t('invite.recipientHelp')}
            hintTone={emailInvalid ? 'danger' : 'muted'}
          />
        ) : (
          <p className="text-xs leading-relaxed text-slate-400">{t('invite.linkHelp')}</p>
        )}
      </Card>

      {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={busy}
        disabled={!recipientReady}
        onClick={() => void create()}
      >
        {buttonLabel}
      </Button>
    </Page>
  );
}
