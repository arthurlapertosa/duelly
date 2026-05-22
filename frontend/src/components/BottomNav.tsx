import { Compass, Handshake, Home } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useI18n } from '../lib/useI18n';

/** Fixed bottom tab bar. Active state is derived reactively from the router location. */
export function BottomNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/home', label: t('app.name'), icon: Home },
    { path: '/templates', label: t('home.explore'), icon: Compass },
    { path: '/bets', label: t('home.myBets'), icon: Handshake },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active =
            location.pathname === tab.path ||
            (tab.path !== '/home' && location.pathname.startsWith(tab.path));
          return (
            <button
              key={tab.path}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                active ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <tab.icon size={20} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
