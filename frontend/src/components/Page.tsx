import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Standard inner-screen wrapper with a subtle enter transition and spacing rhythm. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="space-y-5 pb-2 pt-2"
    >
      {children}
    </motion.div>
  );
}
