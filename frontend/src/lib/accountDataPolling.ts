import type { RefreshAccountDataOptions } from '../store/useAppStore';

export const ACCOUNT_REFRESH_INTERVAL_MS = 15_000;

interface AccountDataPollerOptions {
  getToken(): string | null;
  refresh(options: Required<Pick<RefreshAccountDataOptions, 'signal'>>): Promise<void>;
  intervalMs?: number;
  setInterval?: (handler: () => void, timeout: number) => number;
  clearInterval?: (id: number) => void;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
  createAbortController?: () => AbortController;
  visibilityState?: () => DocumentVisibilityState;
  isOnline?: () => boolean;
}

export function startAccountDataPolling(options: AccountDataPollerOptions): () => void {
  const intervalMs = options.intervalMs ?? ACCOUNT_REFRESH_INTERVAL_MS;
  const setTimer = options.setInterval ?? ((handler, timeout) => window.setInterval(handler, timeout));
  const clearTimer = options.clearInterval ?? ((id) => window.clearInterval(id));
  const addListener = options.addEventListener ?? ((type, listener) => window.addEventListener(type, listener));
  const removeListener = options.removeEventListener ?? ((type, listener) => window.removeEventListener(type, listener));
  const createAbortController = options.createAbortController ?? (() => new AbortController());
  const visibilityState = options.visibilityState ?? (() => document.visibilityState);
  const isOnline = options.isOnline ?? (() => navigator.onLine !== false);
  let stopped = false;
  let currentAbortController: AbortController | null = null;

  const canRefresh = () => Boolean(options.getToken()) && visibilityState() === 'visible' && isOnline();

  const refresh = () => {
    if (stopped || !canRefresh()) return;
    const controller = createAbortController();
    currentAbortController = controller;
    void options
      .refresh({ signal: controller.signal })
      .catch(() => undefined)
      .finally(() => {
        if (currentAbortController === controller) currentAbortController = null;
      });
  };

  const refreshWhenActive = () => refresh();
  const timer = setTimer(refresh, intervalMs);
  addListener('focus', refreshWhenActive);
  addListener('online', refreshWhenActive);
  addListener('visibilitychange', refreshWhenActive);

  return () => {
    stopped = true;
    clearTimer(timer);
    removeListener('focus', refreshWhenActive);
    removeListener('online', refreshWhenActive);
    removeListener('visibilitychange', refreshWhenActive);
    currentAbortController?.abort();
    currentAbortController = null;
  };
}
