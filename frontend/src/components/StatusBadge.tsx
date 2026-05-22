import type { BetStatus } from '../lib/types';
import { useI18n } from '../lib/useI18n';
import { Badge } from './ui';
import type { BadgeTone } from './ui';

const toneByStatus: Record<BetStatus, BadgeTone> = {
  InviteCreated: 'brand',
  Accepted: 'warning',
  FundingSubmitted: 'brand',
  Funded: 'brand',
  Resolved: 'success',
  Voided: 'neutral',
  Expired: 'neutral',
};

/** Bet lifecycle status pill. Never wraps. */
export function StatusBadge({ status }: { status: BetStatus }) {
  const { t } = useI18n();
  return <Badge tone={toneByStatus[status] ?? 'neutral'}>{t(`bet.status.${status}`)}</Badge>;
}
