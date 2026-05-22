import { AlertCircle } from 'lucide-react';

/** Inline error message block. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
