import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { springPop } from '../lib/motion';
import { useMotion } from '../lib/useMotion';
import { Button } from './ui';

interface SuccessStateProps {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  children?: ReactNode;
}

/** Centered confirmation screen shown after a completed flow. */
export function SuccessState({ title, body, action, onAction, children }: SuccessStateProps) {
  const m = useMotion();
  return (
    <div className="space-y-5 pt-6 text-center">
      <motion.div
        initial={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
        animate={m.reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={m.reduced ? { duration: 0.12 } : springPop}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success-50"
      >
        <CheckCircle2 size={36} className="text-success-600" aria-hidden="true" />
      </motion.div>
      <div>
        <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
      </div>
      {children}
      <Button variant="primary" size="lg" fullWidth onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}
