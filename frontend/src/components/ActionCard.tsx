import type { ReactNode } from 'react';

interface ActionCardProps {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}

/** Square quick-action tile used on the Home screen. */
export function ActionCard({ icon, title, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
    </button>
  );
}
