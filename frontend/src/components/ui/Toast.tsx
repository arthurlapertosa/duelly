import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useMotion } from '../../lib/useMotion';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  /** Push a toast. Returns the toast id. */
  show: (message: string, tone?: ToastTone) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneConfig: Record<ToastTone, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'bg-success-600 text-white' },
  error: { icon: AlertTriangle, classes: 'bg-danger-600 text-white' },
  info: { icon: Info, classes: 'bg-slate-900 text-white' },
};

/**
 * Global toast host. Toasts slide/fade in and out via AnimatePresence and
 * auto-dismiss after a short delay. Used for non-blocking confirmations
 * (copy link, share). Form/submit errors keep the inline ErrorBanner.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setToasts((items) => [...items, { id, tone, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 4500),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastHost({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const m = useMotion();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-5 pt-[max(1rem,env(safe-area-inset-top))]"
      role="region"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { icon: Icon, classes } = toneConfig[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout={!m.reduced}
              variants={m.toast}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-overlay',
                classes,
              )}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              <p className="flex-1 text-sm font-semibold">{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-0.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Access the toast host. Throws if used outside ToastProvider. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
