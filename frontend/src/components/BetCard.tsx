import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BetSummaryView } from '../lib/types';
import { formatBRL } from '../lib/format';
import { deriveBetStatus } from '../lib/mappers';
import { useI18n } from '../lib/useI18n';
import { useMotion } from '../lib/useMotion';
import { StatusBadge } from './StatusBadge';

/** Compact summary row for a bet in a list. */
export function BetCard({ bet }: { bet: BetSummaryView }) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const m = useMotion();
  const status = deriveBetStatus(bet);

  return (
    <motion.button
      type="button"
      variants={m.listItem}
      whileTap={m.tapSubtle}
      onClick={() => navigate(`/bets/${bet.bet?.betId ?? bet.invite.id}`)}
      className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <StatusBadge status={status} />
        <span className="shrink-0 text-sm font-bold text-slate-950">
          {formatBRL(bet.invite.stakeRaw, locale)}
        </span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
        {bet.template?.title}
      </p>
    </motion.button>
  );
}
