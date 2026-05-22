import { useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import { deriveBetStatus } from '../lib/mappers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, ScreenHeader, SegmentedControl } from '../components/ui';
import { BetCard, Page, PendingInviteCard } from '../components';

const ACTIVE_STATUSES = ['InviteCreated', 'Accepted', 'FundingSubmitted', 'Funded'];
const FINISHED_STATUSES = ['Resolved', 'Voided', 'Expired'];

/** All of the current user's bets, split into active and finished tabs. */
export function BetsListScreen() {
  const { t } = useI18n();
  const bets = useAppStore((state) => state.bets);
  const pendingInvites = useAppStore((state) => state.pendingInvites);
  const refreshBets = useAppStore((state) => state.refreshBets);
  const refreshPendingInvites = useAppStore((state) => state.refreshPendingInvites);
  const [tab, setTab] = useState<'active' | 'finished'>('active');

  useEffect(() => {
    void Promise.all([refreshBets(), refreshPendingInvites()]);
  }, [refreshBets, refreshPendingInvites]);

  const active = bets.filter((bet) => ACTIVE_STATUSES.includes(deriveBetStatus(bet)));
  const finished = bets.filter((bet) => FINISHED_STATUSES.includes(deriveBetStatus(bet)));
  const activeCount = active.length + pendingInvites.length;
  const activeIsEmpty = activeCount === 0;

  return (
    <Page>
      <ScreenHeader
        eyebrow={t('home.myBets')}
        title={t('bets.title')}
        icon={<Handshake size={20} aria-hidden="true" />}
      />

      <SegmentedControl
        ariaLabel={t('bets.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: `${t('bets.active')} (${activeCount})` },
          { value: 'finished', label: `${t('bets.finished')} (${finished.length})` },
        ]}
      />

      {tab === 'active' ? (
        activeIsEmpty ? (
          <EmptyState icon={<Handshake size={22} aria-hidden="true" />} title={t('bets.emptyActive')} />
        ) : (
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <PendingInviteCard key={invite.invite.id} pending={invite} />
            ))}
            {active.map((bet) => (
              <BetCard key={bet.invite.id} bet={bet} />
            ))}
          </div>
        )
      ) : null}

      {tab === 'finished' ? (
        finished.length === 0 ? (
          <EmptyState icon={<Handshake size={22} aria-hidden="true" />} title={t('bets.emptyFinished')} />
        ) : (
          <div className="space-y-3">
            {finished.map((bet) => (
              <BetCard key={bet.invite.id} bet={bet} />
            ))}
          </div>
        )
      ) : null}
    </Page>
  );
}
