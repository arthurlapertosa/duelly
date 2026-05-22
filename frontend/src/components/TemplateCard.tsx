import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import type { TemplateView } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { templateDisplay } from '../lib/templateDisplay';
import { useI18n } from '../lib/useI18n';
import { useMotion } from '../lib/useMotion';
import { Badge } from './ui';

/** Tappable card for a betting template in the explore list. */
export function TemplateCard({ template }: { template: TemplateView }) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const m = useMotion();
  const display = templateDisplay(template, locale);

  return (
    <motion.button
      type="button"
      variants={m.listItem}
      whileTap={m.tapSubtle}
      onClick={() => navigate(`/templates/${template.id}`)}
      className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Badge tone="brand">{template.category}</Badge>
        <span className="shrink-0 text-[10px] font-medium text-slate-400">{template.source}</span>
      </div>
      <h3 className="mb-3 text-base font-semibold leading-snug text-slate-950">{display.question}</h3>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {display.outcomes.map((outcome, index) => (
          <span
            key={`${outcome}-${index}`}
            className="break-words rounded-xl bg-surface-sunken px-3 py-2 text-center text-xs font-semibold text-slate-600"
          >
            {outcome}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarClock size={13} aria-hidden="true" className="shrink-0" />
        <span className="min-w-0">
          {t('templates.close')} {formatDateTime(template.bettingCloseAt, locale)}
        </span>
      </p>
    </motion.button>
  );
}
