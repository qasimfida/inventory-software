import { onlineRoute } from '@inventory/api-client';
import { OnlineStorePage } from '@/features/storefront/OnlineStorePage';
import { lazy } from 'react';
const ProductPage = lazy(() =>
  import('@/features/catalog/ProductPage').then((module) => ({ default: module.ProductPage })),
);
import { productDetailId } from '@inventory/api-client';
import { SetupChecklist } from '@/features/reports/SetupChecklist';
import { OperationsPanel } from '@/features/operations/OperationsPanel';
import { MemberEditor } from '@/features/organization/MemberEditor';
import { LogsPage } from '@/features/settings/LogsPage';
import { RegisteredBusinesses } from '@/features/platform/RegisteredBusinesses';
import { useSyncExternalStore } from 'react';
import { PlatformOverview } from '@/features/reports/PlatformOverview';
import { settingsModel } from '@/platform/settings';
import { Suspense, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { routeAllowed, workspaceRoutes, overviewDestination } from '@inventory/api-client';
import { ErrorState, EmptyState } from '@/components/common/AsyncState';
import { Skeleton } from '@/components/ui/Skeleton';
import { panels } from '@/features/organization/workflow-panels';
import { Dashboard } from '@/features/reports/Dashboard';
import { PosPanel } from '@/features/pos/PosPanel';
import { hasPermission } from '@inventory/contracts';
import { useWorkspace } from './WorkspaceContext';
import { BusinessSettings } from './BusinessSettings';
import { SettingsPage } from './SettingsPage';
import { CommercePage } from './CommercePage';
export function WorkspaceScreens() {
  const { business, model, state, locations, storeId, warehouseIds, setLocked } = useWorkspace(),
    location = useLocation(),
    navigate = useNavigate();
  const path =
      location.pathname === '/settings/staff'
        ? '/staff'
        : location.pathname === '/settings/users'
          ? '/team'
          : onlineRoute(location.pathname),
    route = workspaceRoutes.find((r) => r.path === (productDetailId(path) ? '/catalog' : path));
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const [visited, setVisited] = useState<string[]>([path]);
  if (!visited.includes(path)) setVisited([...visited, path]);
  if (!location.pathname.startsWith('/online-store') && path !== location.pathname)
    return <Navigate to={path} replace />;
  const destination =
    path === '/dashboard' && settings.snapshot
      ? overviewDestination(business, settings.snapshot.canManagePlatform)
      : null;
  const platformPage = settings.snapshot?.canManagePlatform ? (
    path === '/logs' ? (
      <LogsPage />
    ) : path === '/admin/businesses' ? (
      <RegisteredBusinesses />
    ) : (
      <PlatformOverview />
    )
  ) : (
    <EmptyState message="Platform administrator access required." />
  );
  if (
    (['/admin', '/admin/businesses'].includes(path) ||
      (path === '/logs' && settings.snapshot?.canManagePlatform)) &&
    !state.workspace
  )
    return platformPage;
  if (state.error) return <ErrorState message={state.error} onRetry={() => void model.refresh()} />;
  if (state.busy && !state.workspace) return <Skeleton label="Loading workspace…" />;
  if (!state.businesses.length) return <BusinessSettings onboarding />;
  if (!route && !['/admin', '/admin/businesses'].includes(path))
    return (
      <div className="space-y-3">
        <h2>Page not found</h2>
        <Link to="/dashboard">Return to overview</Link>
      </div>
    );
  if (destination && destination !== path) return <Navigate to={destination} replace />;
  if (route && !routeAllowed(route, business))
    return (
      <div className="space-y-3">
        <h2>Access unavailable</h2>
        <p>Your current membership does not allow this page.</p>
        <Link to="/dashboard">Return to overview</Link>
      </div>
    );
  if (!business || !state.workspace)
    return <EmptyState message="Choose an available business in Settings." />;

  return (
    <>
      {['/admin', '/admin/businesses'].includes(path) && platformPage}
      {productDetailId(path) && (
        <Suspense fallback={<Skeleton label="Loading product…" />}>
          <ProductPage
            key={path}
            business={business}
            locations={locations}
            productId={productDetailId(path)!}
          />
        </Suspense>
      )}
      {[
        '/online-store',
        '/online-store/products',
        '/online-store/products/add',
        '/online-store/products/:id',
        '/online-store/settings',
        '/online-store/settings/general',
        '/online-store/settings/fulfillment',
        '/online-store/settings/policies',
        '/online-store/settings/images',
      ].includes(path) && (
        <OnlineStorePage
          business={business}
          locations={state.workspace.locations}
          path={location.pathname}
        />
      )}
      {path === '/logs' && <LogsPage />}
      {path === '/staff' && (
        <OperationsPanel business={business} locations={state.workspace.locations} />
      )}
      {path === '/team' && (
        <MemberEditor model={model} workspace={state.workspace} busy={state.busy} />
      )}
      {path.startsWith('/settings/') && <SettingsPage />}
      {path === '/dashboard' && (!destination || destination === path) && (
        <div className="space-y-5">
          <SetupChecklist business={business} />
          {hasPermission(business, 'reports.read') ? (
            <Dashboard
              business={business}
              storeId={storeId || undefined}
              warehouseIds={warehouseIds}
            />
          ) : (
            <section className="settings-section space-y-4">
              <h2>Your workspace is ready</h2>
              <p>
                Open a section to begin. Only pages available to your role appear in navigation.
              </p>
              <Link
                className="text-primary underline"
                to={hasPermission(business, 'sales.write') ? '/pos' : '/settings/profile'}
              >
                Start working
              </Link>
            </section>
          )}
        </div>
      )}
      {path === '/sales' && <CommercePage />}
      {path === '/cash' && <CommercePage cash />}
      {visited.includes('/pos') &&
        routeAllowed(
          workspaceRoutes.find((r) => r.path === '/pos')!,
          business,
        ) && (
          <div hidden={path !== '/pos'}>
            <PosPanel
              showBack={false}
              business={business}
              onLockChange={setLocked}
              locations={locations}
              close={() => {
                if (window.history.state?.idx > 0) void navigate(-1);
                else void navigate('/dashboard');
              }}
            />
          </div>
        )}
      {panels
        .filter(
          (p) =>
            visited.includes('/' + p.name) &&
            p.permissions.every((permission) => hasPermission(business, permission)),
        )
        .map(({ name, Component }) => (
          <div key={name} hidden={path !== '/' + name}>
            <Suspense fallback={<Skeleton label="Loading page…" />}>
              <Component
                business={business}
                locations={locations}
                initialSearch={
                  path === `/${name}`
                    ? (new URLSearchParams(location.search).get('search') ?? undefined)
                    : undefined
                }
              />
            </Suspense>
          </div>
        ))}
    </>
  );
}
