import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Handshake, Inbox, LogOut } from 'lucide-react';
import type { PendingInviteView } from '../lib/types';
import { avatarInitial, friendlyName } from '../lib/identity';
import { deriveBetStatus } from '../lib/mappers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { ConfirmDialog, EmptyState, SkeletonList } from '../components/ui';
import {
  ActionCard,
  BetCard,
  MotionList,
  Page,
  PendingInviteCard,
  WalletReadinessCard,
} from '../components';

const ACTIVE_STATUSES = ['InviteCreated', 'Accepted', 'FundingSubmitted', 'Funded'];

/** Authenticated landing screen: greeting, wallet, quick actions, invites, active bets. */
export function HomeScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const bets = useAppStore((state) => state.bets);
  const betsLoaded = useAppStore((state) => state.betsLoaded);
  const pendingInvites = useAppStore((state) => state.pendingInvites);
  const logout = useAppStore((state) => state.logout);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const activeBets = bets.filter((bet) => ACTIVE_STATUSES.includes(deriveBetStatus(bet)));
  const name = friendlyName(user?.displayIdentifier);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <Page>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-brand"
          >
            {avatarInitial(user?.displayIdentifier)}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{t('home.hello')},</p>
            <p className="truncate text-lg font-bold text-slate-950">{name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <LogOut size={14} aria-hidden="true" />
          {t('common.logout')}
        </button>
      </div>

      <WalletReadinessCard />

      <MotionList className="grid grid-cols-2 gap-3 space-y-0">
        <ActionCard
          icon={<Compass size={18} aria-hidden="true" />}
          title={t('home.explore')}
          onClick={() => navigate('/templates')}
        />
        <ActionCard
          icon={<Handshake size={18} aria-hidden="true" />}
          title={t('home.myBets')}
          onClick={() => navigate('/bets')}
        />
      </MotionList>

      {pendingInvites.length > 0 ? <PendingInvitesSection invites={pendingInvites} /> : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">{t('home.activeBets')}</h2>
          <button
            type="button"
            onClick={() => navigate('/bets')}
            className="shrink-0 rounded-lg px-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('common.all')}
          </button>
        </div>
        {!betsLoaded ? (
          <SkeletonList count={2} />
        ) : activeBets.length === 0 ? (
          <EmptyState
            icon={<Handshake size={22} aria-hidden="true" />}
            title={t('home.noActiveBets')}
            actionLabel={t('home.startWithTemplates')}
            onAction={() => navigate('/templates')}
          />
        ) : (
          <MotionList>
            {activeBets.slice(0, 3).map((bet) => (
              <BetCard key={bet.invite.id} bet={bet} />
            ))}
          </MotionList>
        )}
      </section>

      <ConfirmDialog
        open={logoutOpen}
        title={t('home.logoutConfirmTitle')}
        description={t('home.logoutConfirmBody')}
        confirmLabel={t('common.logout')}
        cancelLabel={t('common.cancel')}
        loading={loggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={() => setLogoutOpen(false)}
      />
    </Page>
  );
}

function PendingInvitesSection({ invites }: { invites: PendingInviteView[] }) {
  const { t } = useI18n();
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Inbox size={16} className="shrink-0 text-brand-600" aria-hidden="true" />
        <h2 className="text-base font-semibold text-slate-950">{t('home.pendingInvites')}</h2>
      </div>
      <MotionList>
        {invites.map((invite) => (
          <PendingInviteCard key={invite.invite.id} pending={invite} />
        ))}
      </MotionList>
    </section>
  );
}
