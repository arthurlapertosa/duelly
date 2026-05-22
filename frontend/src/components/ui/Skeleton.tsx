import { cn } from '../../lib/cn';

interface SkeletonProps {
  variant?: 'block' | 'line' | 'circle';
  className?: string;
  width?: string;
  height?: string;
}

/** Loading-state placeholder primitive. Wired into screens in a later stage. */
export function Skeleton({ variant = 'block', className, width, height }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-slate-200/80',
        variant === 'line' && 'h-3 rounded-full',
        variant === 'block' && 'rounded-2xl',
        variant === 'circle' && 'rounded-full',
        className,
      )}
      style={{ width, height }}
    />
  );
}
