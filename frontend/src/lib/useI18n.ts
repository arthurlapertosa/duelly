import { translate } from './i18n';
import { useAppStore } from '../store/useAppStore';

/** Reactive i18n hook bound to the active locale in the store. */
export function useI18n() {
  const locale = useAppStore((state) => state.locale);
  return {
    locale,
    t: (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
  };
}
