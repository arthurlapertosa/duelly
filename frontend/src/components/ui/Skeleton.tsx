import { cn } from '../../lib/cn';

interface SkeletonProps {
  variant?: 'block' | 'line' | 'circle';
  className?: string;
  width?: string;
  height?: string;
}

/**
 * Loading-state placeholder primitive with a shimmer sweep.
 * The shimmer is disabled automatically under `prefers-reduced-motion`.
 */
export function Skeleton({ variant = 'block', className, width, height }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-skeleton-shimmer',
        variant === 'line' && 'h-3 rounded-full',
        variant === 'block' && 'rounded-2xl',
        variant === 'circle' && 'rounded-full',
        className,
      )}
      style={{ width, height }}
    />
  );
}

/** Card-shaped skeleton matching the rounded list-row surfaces. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-3xl border border-slate-100 bg-white p-4 shadow-card', className)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton variant="line" width="38%" />
        <Skeleton variant="line" width="22%" />
      </div>
      <Skeleton variant="line" width="85%" />
      <Skeleton variant="line" className="mt-2" width="60%" />
    </div>
  );
}

/** A vertical stack of card skeletons for list loading states. */
export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
