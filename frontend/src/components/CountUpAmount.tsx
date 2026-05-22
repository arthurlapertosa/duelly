import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';
import { formatBRL, rawToNumber } from '../lib/format';
import type { Locale } from '../lib/types';
import { useMotion } from '../lib/useMotion';

interface CountUpAmountProps {
  /** Raw BRL1 value to count up to. */
  raw: string;
  locale: Locale;
  className?: string;
}

/**
 * Animated BRL amount that counts up from zero to its final value.
 * Used for the win-payout moment on the bet detail screen. Falls back
 * to the final value immediately under reduced motion.
 */
export function CountUpAmount({ raw, locale, className }: CountUpAmountProps) {
  const m = useMotion();
  const target = rawToNumber(raw);
  const [display, setDisplay] = useState(m.reduced ? target : 0);

  useEffect(() => {
    if (m.reduced) {
      setDisplay(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (value) => setDisplay(value),
    });
    return () => controls.stop();
  }, [target, m.reduced]);

  const formatted = display.toLocaleString(locale, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={className}>
      {/* Final value also rendered for assistive tech / no-JS correctness. */}
      <span aria-hidden="true">{formatted}</span>
      <span className="sr-only">{formatBRL(raw, locale)}</span>
    </span>
  );
}
