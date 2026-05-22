import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { springSoft } from '../../lib/motion';
import { useMotion } from '../../lib/useMotion';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  scrollable?: boolean;
  className?: string;
}

/**
 * Accessible segmented toggle (tablist semantics).
 * The active thumb slides between options via a shared `layoutId`.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  scrollable = false,
  className,
}: SegmentedControlProps<T>) {
  const m = useMotion();
  // Unique id so multiple segmented controls on one screen do not share a thumb.
  const thumbId = useId();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'rounded-2xl bg-surface-sunken p-1',
        scrollable ? 'flex gap-1 overflow-x-auto' : 'grid',
        className,
      )}
      style={!scrollable ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-xl font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3 py-2.5 text-sm',
              scrollable && 'whitespace-nowrap',
              active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segmented-thumb-${thumbId}`}
                className="absolute inset-0 rounded-xl bg-white shadow-card"
                transition={m.reduced ? { duration: 0 } : springSoft}
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
