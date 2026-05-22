import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'brand' | 'success' | 'danger' | 'warning' | 'neutral';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  uppercase?: boolean;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  warning: 'bg-warning-50 text-warning-700',
  neutral: 'bg-slate-100 text-slate-600',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-1 text-[10px]',
  md: 'px-3 py-1 text-xs',
};

/** Status / category pill. Never wraps. */
export function Badge({
  tone = 'brand',
  size = 'sm',
  uppercase = true,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-bold',
        uppercase && 'uppercase tracking-wide',
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
