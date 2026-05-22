import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/useI18n';
import { LanguageToggle } from './LanguageToggle';

/** Persistent top app bar: brand mark on the left, language switcher on the right. */
export function AppHeader() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 -mx-5 mb-1 border-b border-slate-100 bg-surface-muted/85 px-5 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 rounded-xl py-0.5 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
            <Zap size={17} aria-hidden="true" />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-950">{t('app.name')}</span>
        </button>
        <LanguageToggle />
      </div>
    </header>
  );
}
