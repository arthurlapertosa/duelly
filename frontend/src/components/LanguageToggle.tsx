import { Languages } from 'lucide-react';
import { locales } from '../lib/i18n';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/cn';

/** Compact language switcher used inside the app header. */
export function LanguageToggle() {
  const { locale, t } = useI18n();
  const setLocale = useAppStore((state) => state.setLocale);

  return (
    <div
      role="group"
      aria-label={t('app.name')}
      className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 shadow-card"
    >
      <Languages size={14} className="ml-1.5 mr-0.5 text-slate-400" aria-hidden="true" />
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={locale === item}
          onClick={() => setLocale(item)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            locale === item ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {t(`locale.${item}`)}
        </button>
      ))}
    </div>
  );
}
