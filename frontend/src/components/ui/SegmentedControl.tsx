import { cn } from '../../lib/cn';

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
 * Replaces every 2/4-option tab toggle across the app.
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
              'rounded-xl font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3 py-2.5 text-sm',
              scrollable && 'whitespace-nowrap',
              active ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
