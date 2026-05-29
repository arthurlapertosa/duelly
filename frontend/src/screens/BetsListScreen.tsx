import { useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import { deriveBetStatus } from '../lib/mappers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, ScreenHeader, SegmentedControl, SkeletonList } from '../components/ui';
import { BetCard, MotionList, Page, PendingInviteCard } from '../components';

const ACTIVE_STATUSES = ['InviteCreated', 'Accepted', 'FundingSubmitted', 'Funded'];
const FINISHED_STATUSES = ['Resolved', 'Voided', 'Expired'];

/** All of the current user's bets, split into active and finished tabs. */
export function BetsListScreen() {
  const { t } = useI18n();
  const bets = useAppStore((state) => state.bets);
  const pendingInvites = useAppStore((state) => state.pendingInvites);
  const betsLoaded = useAppStore((state) => state.betsLoaded);
  const pendingInvitesLoaded = useAppStore((state) => state.pendingInvitesLoaded);
  const refreshAccountData = useAppStore((state) => state.refreshAccountData);
  const [tab, setTab] = useState<'active' | 'finished'>('active');

  useEffect(() => {
    void refreshAccountData({ force: true });
  }, [refreshAccountData]);

  const active = bets.filter((bet) => ACTIVE_STATUSES.includes(deriveBetStatus(bet)));
  const finished = bets.filter((bet) => FINISHED_STATUSES.includes(deriveBetStatus(bet)));
  const activeCount = active.length + pendingInvites.length;
  const activeIsEmpty = activeCount === 0;
  // Only trust "empty" once the relevant fetches have completed at least once.
  const loaded = betsLoaded && pendingInvitesLoaded;

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
        !loaded ? (
          <SkeletonList count={3} />
        ) : activeIsEmpty ? (
          <EmptyState icon={<Handshake size={22} aria-hidden="true" />} title={t('bets.emptyActive')} />
        ) : (
          <MotionList>
            {pendingInvites.map((invite) => (
              <PendingInviteCard key={invite.invite.id} pending={invite} />
            ))}
            {active.map((bet) => (
              <BetCard key={bet.invite.id} bet={bet} />
            ))}
          </MotionList>
        )
      ) : null}

      {tab === 'finished' ? (
        !loaded ? (
          <SkeletonList count={2} />
        ) : finished.length === 0 ? (
          <EmptyState icon={<Handshake size={22} aria-hidden="true" />} title={t('bets.emptyFinished')} />
        ) : (
          <MotionList>
            {finished.map((bet) => (
              <BetCard key={bet.invite.id} bet={bet} />
            ))}
          </MotionList>
        )
      ) : null}
    </Page>
  );
}
