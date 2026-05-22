import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { useMotion } from '../lib/useMotion';

interface MotionListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Staggered list container. Children rendered with `variants={m.listItem}`
 * (TemplateCard, BetCard, PendingInviteCard, ActionCard) animate in
 * sequentially. Collapses to instant under reduced motion.
 */
export function MotionList({ children, className }: MotionListProps) {
  const m = useMotion();
  return (
    <motion.div
      variants={m.listContainer}
      initial="initial"
      animate="animate"
      className={cn('space-y-3', className)}
    >
      {children}
    </motion.div>
  );
}
