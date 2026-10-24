import { DesktopLinks } from './DesktopLinks';
import { lazy, Suspense } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { AuthPanel } from '@/features/auth/AuthPanel';
import { RecoveryPage } from '@/features/auth/RecoveryPage';
import { OfflinePanel } from '@/features/offline/OfflinePanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { SessionProvider, useAccount } from './SessionContext';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext';
import { AppShell } from './AppShell';
import { WorkspaceScreens } from './WorkspaceScreens';
const DemoWorkspace =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true'
    ? lazy(() => import('./DemoWorkspace'))
    : null;
export function Application() {
  return DemoWorkspace ? (
    <Suspense fallback={<Skeleton label="Loading demonstration…" />}>
      <DemoWorkspace>
        <SessionProvider>
          <DesktopLinks />
          <SessionRoutes />
        </SessionProvider>
      </DemoWorkspace>
    </Suspense>
  ) : (
    <SessionProvider>
      <DesktopLinks />
      <SessionRoutes />
    </SessionProvider>
  );
}
function SessionRoutes() {
  const account = useAccount(),
    location = useLocation();
  if (['/auth/forgot', '/auth/reset', '/auth/link'].includes(location.pathname))
    return <RecoveryPage key={location.key} />;
  if (['/auth/login', '/auth/invitation'].includes(location.pathname))
    return <AuthPanel key={location.key} />;
  if (location.pathname === '/offline')
    return (
      <main className="shell-content space-y-5">
        <h1>Prepared offline register</h1>
        <p>
          Unlock an existing encrypted register. Its permissions remain bounded by the original
          grant; this does not authorize online requests.
        </p>
        <OfflinePanel allowSetup={false} />
        <Link to={account.session ? '/settings/device' : '/auth/login'}>
          Return to {account.session ? 'device settings' : 'sign in'}
        </Link>
      </main>
    );
  if (account.busy && !account.session)
    return (
      <main className="auth-layout">
        <Skeleton label="Checking saved session…" />
      </main>
    );
  if (!account.session) return <Navigate to="/auth/login" replace />;
  if (location.pathname === '/' || location.pathname === '/settings')
    return <Navigate to={location.pathname === '/' ? '/dashboard' : '/settings/profile'} replace />;
  return (
    <WorkspaceProvider key={account.session.user.id}>
      <ProtectedWorkspace />
    </WorkspaceProvider>
  );
}
function ProtectedWorkspace() {
  const { business, selectionKey } = useWorkspace();
  return (
    <AppShell>
      <WorkspaceScreens key={`${business?.id ?? 'onboarding'}-${selectionKey}`} />
    </AppShell>
  );
}
