import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useMotion } from '../../lib/useMotion';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 * Bottom-sheet / dialog primitive. Mounts and unmounts with an
 * AnimatePresence-driven slide/fade. Used for confirmation flows
 * (log out, unlink wallet, cancel invite) and informational panels.
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
  const m = useMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Remember what was focused so we can restore it on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      // Keep Tab focus inside the dialog while it is open.
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog so keyboard users land on its controls.
    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            'fixed inset-0 z-50 flex',
            variant === 'sheet' ? 'items-end' : 'items-center justify-center p-5',
          )}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            variants={m.overlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-slate-950/40"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={variant === 'sheet' ? m.sheet : m.dialog}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'relative w-full bg-white shadow-overlay',
              variant === 'sheet'
                ? 'mx-auto max-w-md rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]'
                : 'max-w-sm rounded-3xl',
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
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
