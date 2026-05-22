import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '../lib/useMotion';

const COLORS = ['#2563eb', '#059669', '#f59e0b', '#ef4444', '#8b5cf6'];
const PIECE_COUNT = 14;

/**
 * Lightweight win celebration: a one-shot burst of confetti pieces driven
 * entirely by Framer Motion (no extra dependency). Renders nothing when the
 * user prefers reduced motion. Purely decorative — `aria-hidden`.
 */
export function ConfettiBurst() {
  const m = useMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, index) => {
        const angle = (index / PIECE_COUNT) * Math.PI * 2;
        const distance = 70 + Math.random() * 60;
        return {
          id: index,
          color: COLORS[index % COLORS.length],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 30,
          rotate: (Math.random() - 0.5) * 360,
          delay: Math.random() * 0.08,
        };
      }),
    [],
  );

  if (m.reduced) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden"
    >
      <div className="relative h-0 w-0">
        {pieces.map((piece) => (
          <motion.span
            key={piece.id}
            className="absolute h-2 w-1.5 rounded-[1px]"
            style={{ backgroundColor: piece.color }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.6, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: piece.x,
              y: [0, piece.y, piece.y + 90],
              scale: 1,
              rotate: piece.rotate,
            }}
            transition={{ duration: 1.1, delay: piece.delay, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}
