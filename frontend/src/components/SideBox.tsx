import { cn } from '../lib/cn';
import { useI18n } from '../lib/useI18n';

interface SideBoxProps {
  label: string;
  value: string;
  muted?: boolean;
  selected?: boolean;
}

/** One player's side in a duel matchup. */
export function SideBox({ label, value, muted = false, selected = false }: SideBoxProps) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 text-center',
        selected
          ? 'border-success-100 bg-success-50 text-success-700'
          : muted
            ? 'border-transparent bg-surface-sunken text-slate-500'
            : 'border-transparent bg-brand-50 text-brand-700',
      )}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
      {selected ? (
        <p className="mt-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-success-700">
          {t('bet.yourPick')}
        </p>
      ) : null}
    </div>
  );
}
