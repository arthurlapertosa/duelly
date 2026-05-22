import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useI18n } from '../../lib/useI18n';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  icon?: ReactNode;
  /** When set, renders a back button. `true` uses history; a string navigates to that path. */
  back?: boolean | string;
  /** Trailing slot (e.g. a status badge or action). Pinned, never wraps. */
  trailing?: ReactNode;
  className?: string;
}

/** Consistent inner-screen header with optional back button and trailing slot. */
export function ScreenHeader({
  title,
  eyebrow,
  description,
  icon,
  back,
  trailing,
  className,
}: ScreenHeaderProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <header className={cn('space-y-3', className)}>
      {back ? (
        <button
          type="button"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {t('common.back')}
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-bold leading-tight text-slate-950">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
        {trailing ? (
          <div className="flex shrink-0 items-center">{trailing}</div>
        ) : icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            {icon}
          </div>
        ) : null}
      </div>
    </header>
  );
}
