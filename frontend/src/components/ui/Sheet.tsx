import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** 'sheet' rises from the bottom (mobile-first), 'dialog' is a centered modal. */
  variant?: 'sheet' | 'dialog';
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Bottom-sheet / dialog primitive. Used now for the foundation;
 * confirmation flows are wired in a later stage.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  variant = 'sheet',
  children,
  footer,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        variant === 'sheet' ? 'items-end' : 'items-center justify-center p-5',
      )}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-overlay-fade bg-slate-950/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full bg-white shadow-overlay',
          variant === 'sheet'
            ? 'mx-auto max-w-md animate-sheet-rise rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]'
            : 'max-w-sm animate-overlay-fade rounded-3xl',
        )}
      >
        {variant === 'sheet' ? (
          <div className="flex justify-center pt-3">
            <span className="h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />
          </div>
        ) : null}
        {(title || variant === 'dialog') && (
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div className="min-w-0">
              {title ? <h2 className="text-base font-bold text-slate-950">{title}</h2> : null}
              {description ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {children ? <div className="px-5 pt-4">{children}</div> : null}
        {footer ? <div className="px-5 pt-4">{footer}</div> : null}
        <div className="h-5" />
      </div>
    </div>
  );
}
