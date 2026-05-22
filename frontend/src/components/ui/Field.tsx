import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  icon?: ReactNode;
  prefix?: ReactNode;
  hint?: ReactNode;
  hintTone?: 'muted' | 'danger';
  invalid?: boolean;
}

/**
 * Labelled input with an optional icon/prefix slot and a focus ring.
 * The visible label is wired to the input via htmlFor for accessibility.
 */
export function Field({
  label,
  icon,
  prefix,
  hint,
  hintTone = 'muted',
  invalid = false,
  className,
  id,
  ...inputProps
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('block', className)}>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 transition-colors',
          'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15',
          invalid ? 'border-danger-600' : 'border-slate-200',
        )}
      >
        {icon ? <span className="shrink-0 text-slate-400">{icon}</span> : null}
        {prefix ? <span className="shrink-0 text-sm font-semibold text-slate-500">{prefix}</span> : null}
        <input
          id={inputId}
          aria-invalid={invalid || undefined}
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          {...inputProps}
        />
      </div>
      {hint ? (
        <p className={cn('mt-1.5 text-xs', hintTone === 'danger' ? 'text-danger-600' : 'text-slate-400')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
