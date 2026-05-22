import { useNavigate } from 'react-router-dom';
import { Compass, Handshake, Inbox } from 'lucide-react';
import type { PendingInviteView } from '../lib/types';
import { deriveBetStatus } from '../lib/mappers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { EmptyState } from '../components/ui';
import {
  ActionCard,
  BetCard,
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
  const pendingInvites = useAppStore((state) => state.pendingInvites);
  const logout = useAppStore((state) => state.logout);
  const activeBets = bets.filter((bet) => ACTIVE_STATUSES.includes(deriveBetStatus(bet)));

  return (
    <Page>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{t('home.hello')},</p>
          <h1 className="truncate text-2xl font-bold text-slate-950">{user?.displayIdentifier}</h1>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="shrink-0 rounded-lg px-1 py-0.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('common.logout')}
        </button>
      </div>

      <WalletReadinessCard />

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {pendingInvites.length > 0 ? <PendingInvitesSection invites={pendingInvites} /> : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">{t('home.activeBets')}</h2>
          <button
            type="button"
            onClick={() => navigate('/bets')}
            className="rounded-lg px-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('common.all')}
          </button>
        </div>
        {activeBets.length === 0 ? (
          <EmptyState
            icon={<Handshake size={22} aria-hidden="true" />}
            title={t('home.noActiveBets')}
            actionLabel={t('home.startWithTemplates')}
            onAction={() => navigate('/templates')}
          />
        ) : (
          <div className="space-y-3">
            {activeBets.slice(0, 3).map((bet) => (
              <BetCard key={bet.invite.id} bet={bet} />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}

function PendingInvitesSection({ invites }: { invites: PendingInviteView[] }) {
  const { t } = useI18n();
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Inbox size={16} className="text-brand-600" aria-hidden="true" />
        <h2 className="text-base font-semibold text-slate-950">{t('home.pendingInvites')}</h2>
      </div>
      <div className="space-y-3">
        {invites.map((invite) => (
          <PendingInviteCard key={invite.invite.id} pending={invite} />
        ))}
      </div>
    </section>
  );
}
