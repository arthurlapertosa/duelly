import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardElevation = 'flat' | 'card' | 'raised';
export type CardTone = 'default' | 'brand' | 'muted';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section';
  padding?: CardPadding;
  elevation?: CardElevation;
  tone?: CardTone;
  children: ReactNode;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const elevationClasses: Record<CardElevation, string> = {
  flat: '',
  card: 'shadow-card',
  raised: 'shadow-raised',
};

const toneClasses: Record<CardTone, string> = {
  default: 'border border-slate-100 bg-white',
  brand: 'border border-brand-100 bg-brand-50',
  muted: 'border border-slate-100 bg-surface-muted',
};

/** Consistent rounded container — the base surface used across screens. */
export function Card({
  as = 'section',
  padding = 'md',
  elevation = 'card',
  tone = 'default',
  className,
  children,
  ...rest
}: CardProps) {
  const Component = as;
  return (
    <Component
      className={cn(
        'rounded-3xl',
        toneClasses[tone],
        paddingClasses[padding],
        elevationClasses[elevation],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
