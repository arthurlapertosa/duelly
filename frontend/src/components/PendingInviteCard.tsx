import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Handshake } from 'lucide-react';
import type { PendingInviteView } from '../lib/types';
import { formatBRL } from '../lib/format';
import { useI18n } from '../lib/useI18n';
import { useMotion } from '../lib/useMotion';
import { Badge } from './ui';

/** Inbox card for an invite the current user can review and accept. */
export function PendingInviteCard({ pending }: { pending: PendingInviteView }) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const m = useMotion();

  return (
    <motion.button
      type="button"
      variants={m.listItem}
      whileTap={m.tapSubtle}
      onClick={() => navigate(`/invite/${pending.invite.id}`)}
      className="w-full rounded-3xl border border-brand-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <Badge tone="brand">{t('invite.newTitle')}</Badge>
        <span className="shrink-0 text-sm font-bold text-slate-950">
          {formatBRL(pending.invite.stakeRaw, locale)}
        </span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
        {pending.template?.title ?? t('invite.newBody')}
      </p>
      <p className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-brand-600">
        <Handshake size={13} aria-hidden="true" className="shrink-0" />
        <span className="min-w-0 truncate">{t('invite.review')}</span>
        <ArrowRight size={13} aria-hidden="true" className="ml-auto shrink-0" />
      </p>
    </motion.button>
  );
}
