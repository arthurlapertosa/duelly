import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '../lib/useMotion';

/** Standard inner-screen wrapper with a route-aware enter/exit transition. */
export function Page({ children }: { children: ReactNode }) {
  const m = useMotion();
  return (
    <motion.div
      variants={m.page}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-5 pb-2 pt-2"
    >
      {children}
    </motion.div>
  );
}
