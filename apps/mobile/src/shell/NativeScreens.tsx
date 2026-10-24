import { OperationsPanel } from '../operations/OperationsPanel';
import { MemberEditor } from '../organization/MemberEditor';
import { LogsPage } from '../settings/LogsPage';
import { RegisteredBusinesses } from '../platform-businesses/RegisteredBusinesses';
import { useSyncExternalStore } from 'react';
import { PlatformOverview } from '../reports/PlatformOverview';
import { settingsModel } from '../settings/model';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { routeAllowed, workspaceRoutes, overviewDestination } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { LoadingState, EmptyState } from '../ui/AsyncState';
import { panels } from '../organization/ManagementWorkflows';
import { Dashboard } from '../reports/Dashboard';
import { PosPanel } from '../pos/PosPanel';
import { CashPanel } from '../pos/CashPanel';
import { ReceiptPanel } from '../pos/ReceiptPanel';
import { useWorkspace } from './WorkspaceContext';
import { useNavigation } from './Navigation';
import { SettingsScreen } from './SettingsScreen';
import { BusinessSettings } from './BusinessSettings';
export function NativeScreens() {
  const { path, search, navigate } = useNavigation(),
    { state, model, business, locations, storeId, warehouseIds, setLocked } = useWorkspace();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const [visited, setVisited] = useState<string[]>([]);
  const destination = overviewDestination(business, settings.snapshot?.canManagePlatform ?? false);
  useEffect(() => {
    if (path === '/dashboard' && settings.snapshot && destination !== path)
      navigate(destination, true);
  }, [path, destination, navigate, settings.snapshot]);
  if (!visited.includes(path)) setVisited([...visited, path]);
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
  if (path === '/dashboard' && settings.snapshot && destination !== path)
    return <LoadingState message="Opening your workspace…" />;
  const route = workspaceRoutes.find(
    (r) => r.path === (path === '/more' ? '/settings/profile' : path),
  );
  if (
    (!route && !['/admin', '/admin/businesses'].includes(path)) ||
    (route && !routeAllowed(route, business))
  )
    return (
      <>
        <EmptyState message="This page is unavailable for your current access." />
        <Action label="Go to dashboard" onPress={() => navigate('/dashboard', true)} />
      </>
    );
  if (state.error)
    return (
      <>
        <Text tone="error" accessibilityRole="alert">
          {state.error}
        </Text>
        <Action label="Retry workspace" onPress={() => void model.refresh()} />
      </>
    );
  if (state.busy && !state.workspace) return <LoadingState message="Loading workspace…" />;
  if (!state.businesses.length) return <BusinessSettings />;
  if (!business || !state.workspace) return <LoadingState message="Opening business…" />;
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const warehouseId = warehouses[0]?.id;
  return (
    <>
      {['/admin', '/admin/businesses'].includes(path) && platformPage}
      {path === '/dashboard' && destination === path && (
        <Dashboard business={business} storeId={storeId || undefined} warehouseIds={warehouseIds} />
      )}
      {path === '/logs' && <LogsPage />}
      {path === '/staff' && (
        <OperationsPanel business={business} locations={state.workspace.locations} />
      )}
      {path === '/team' && (
        <MemberEditor model={model} workspace={state.workspace} busy={state.busy} />
      )}
      {path.startsWith('/settings/') && <SettingsScreen />}
      {['/sales', '/cash'].includes(path) && (
        <>
          {warehouseId ? (
            path === '/cash' ? (
              <CashPanel business={business} warehouseId={warehouseId} locations={locations} />
            ) : (
              <ReceiptPanel business={business} warehouseId={warehouseId} />
            )
          ) : (
            <EmptyState message="Create a warehouse in location settings to begin." />
          )}
        </>
      )}
      {visited.includes('/pos') &&
        routeAllowed(
          workspaceRoutes.find((r) => r.path === '/pos')!,
          business,
        ) && (
          <View
            style={{ display: path === '/pos' ? 'flex' : 'none' }}
            accessibilityElementsHidden={path !== '/pos'}
            importantForAccessibility={path === '/pos' ? 'auto' : 'no-hide-descendants'}
          >
            <PosPanel
              showBack={false}
              business={business}
              onLockChange={setLocked}
              locations={locations}
              close={() => navigate('/dashboard', true)}
            />
          </View>
        )}
      {panels
        .filter(
          (p) =>
            visited.includes(`/${p.name}`) &&
            routeAllowed(
              workspaceRoutes.find((r) => r.panel === p.name)!,
              business,
            ),
        )
        .map(({ name, Component }) => (
          <View
            key={name}
            style={{ display: path === `/${name}` ? 'flex' : 'none' }}
            accessibilityElementsHidden={path !== `/${name}`}
            importantForAccessibility={path === `/${name}` ? 'auto' : 'no-hide-descendants'}
          >
            <Component
              page
              business={business}
              locations={locations}
              initialSearch={path === `/${name}` ? search : undefined}
            />
          </View>
        ))}
    </>
  );
}
