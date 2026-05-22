import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Zap } from 'lucide-react';
import { errorMessage } from '../lib/errors';
import { safeReturnTo } from '../lib/betHelpers';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { Button, Field, SegmentedControl } from '../components/ui';
import { ErrorBanner, LanguageToggle } from '../components';

/** Login / register entry screen. */
export function OnboardingScreen() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAppStore((state) => state.login);
  const loading = useAppStore((state) => state.loading);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password, mode === 'register');
      navigate(safeReturnTo(params.get('returnTo')) ?? '/home', { replace: true });
    } catch (cause) {
      setError(cause);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white px-6 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="mx-auto w-full max-w-xs">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-brand">
              <Zap size={30} aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t('app.name')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('auth.subhead')}</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <SegmentedControl
              ariaLabel={t('app.name')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'login', label: t('auth.mode.login') },
                { value: 'register', label: t('auth.mode.register') },
              ]}
            />
            <Field
              label={t('auth.email')}
              icon={<Mail size={16} aria-hidden="true" />}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
            />
            <Field
              label={t('auth.password')}
              icon={<Lock size={16} aria-hidden="true" />}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              hint={mode === 'register' ? t('auth.passwordHelp') : undefined}
            />
            {error ? <ErrorBanner message={errorMessage(locale, error)} /> : null}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              {mode === 'register' ? t('auth.register') : t('auth.enter')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
