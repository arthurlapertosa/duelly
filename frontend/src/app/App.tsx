import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { startAccountDataPolling } from '../lib/accountDataPolling';
import { useAppStore } from '../store/useAppStore';
import { AppHeader, BottomNav } from '../components';
import { ToastProvider } from '../components/ui';
import {
  AcceptInviteScreen,
  BetDetailScreen,
  BetsListScreen,
  CreateInviteScreen,
  HomeScreen,
  OnboardingScreen,
  TemplateDetailScreen,
  TemplatesScreen,
} from '../screens';

/** App root: router, bootstrap, and the global toast host. */
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppBootstrap />
      </ToastProvider>
    </BrowserRouter>
  );
}

function AppBootstrap() {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const location = useLocation();
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <>
      <AccountDataPoller />
      {/* AnimatePresence keyed on the pathname gives every route an enter AND
          exit transition. `mode="wait"` lets the outgoing screen fully leave
          before the next mounts, so duplicate controls never overlap. */}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<OnboardingScreen />} />
          <Route
            path="/home"
            element={
              <Protected>
                <Shell>
                  <HomeScreen />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/templates"
            element={
              <Protected>
                <Shell>
                  <TemplatesScreen />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/templates/:id"
            element={
              <Protected>
                <Shell>
                  <TemplateDetailScreen />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/create-invite"
            element={
              <Protected>
                <Shell>
                  <CreateInviteScreen />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/invite/:id"
            element={
              <Protected>
                <Shell>
                  <AcceptInviteScreen />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/bets"
            element={
              <Protected>
                <Shell>
                  <BetsListScreen />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/bets/:id"
            element={
              <Protected>
                <Shell>
                  <BetDetailScreen />
                </Shell>
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

function AccountDataPoller() {
  const token = useAppStore((state) => state.token);
  const refreshAccountData = useAppStore((state) => state.refreshAccountData);
  useEffect(() => {
    if (!token) return undefined;
    return startAccountDataPolling({
      getToken: () => useAppStore.getState().token,
      refresh: ({ signal }) => refreshAccountData({ signal }),
    });
  }, [refreshAccountData, token]);
  return null;
}

function Protected({ children }: { children: ReactNode }) {
  const token = useAppStore((state) => state.token);
  const location = useLocation();
  if (!token) {
    return (
      <Navigate
        to={`/?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
        replace
      />
    );
  }
  return children;
}

/** Authenticated app frame: top header, scrollable content, bottom nav. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-surface-muted">
      <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-24">
        <AppHeader />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
