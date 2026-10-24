import { useWorkspace } from '../shell/WorkspaceContext';
import { useNavigation } from '../shell/Navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createPlatformBusinessesClient, cancellableResource } from '@inventory/api-client';
import type { PlatformBusinessesQuery } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { SearchControl } from '../ui/SearchControl';
import { ViewTabs } from '../ui/ViewTabs';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { useTheme } from '../theme';
import { BusinessDirectory } from './BusinessDirectory';
import { AddBusiness } from './AddBusiness';
export function RegisteredBusinesses() {
  const { model: workspaceModel } = useWorkspace();
  const { navigate } = useNavigation();
  const [manageError, setManageError] = useState('');
  async function manage(id: string, location: boolean) {
    setManageError('');
    await workspaceModel.select(id);
    if (workspaceModel.snapshot().workspace?.business.id === id)
      void navigate(location ? '/settings/locations' : '/settings/business');
    else
      setManageError('Unable to open this workspace. It may be inactive or no longer accessible.');
  }

  const theme = useTheme(),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState<NonNullable<PlatformBusinessesQuery['state']>>('all'),
    [offset, setOffset] = useState(0),
    [grid, setGrid] = useState(false),
    [revision, setRevision] = useState(0);
  const request = useMemo(() => {
    void revision; // Recreate the read after a successful local registration.
    return cancellableResource(
      (signal) =>
        createPlatformBusinessesClient(authClient.accountRequest).list(
          { search, state: filter, offset },
          signal,
        ),
      () => new AbortController(),
    );
  }, [search, filter, offset, revision]);
  const raw = useSyncExternalStore(request.model.subscribe, request.model.snapshot);
  const state = usePageCollection(raw, [search, filter, revision], offset, ['businesses'], () =>
    setOffset(0),
  );
  useEffect(() => {
    const timer = setTimeout(() => void request.model.run(), 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [request]);
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text>Browse business registrations and their stores and warehouses.</Text>
      <AddBusiness
        onCreated={() => {
          setOffset(0);
          setRevision((value) => value + 1);
        }}
      />
      <SearchControl
        label="Search registered businesses"
        value={search}
        onChange={(value) => {
          setSearch(value);
          setOffset(0);
        }}
        suggestions={state.data?.businesses.map((b) => ({ value: b.name, label: b.name })) ?? []}
      />
      <Choice
        label="Business status"
        value={filter}
        options={['all', 'active', 'suspended', 'archived'].map((value) => ({
          value,
          label: value === 'all' ? 'All statuses' : value,
        }))}
        onChange={(value) => {
          if (
            value === 'all' ||
            value === 'active' ||
            value === 'suspended' ||
            value === 'archived'
          ) {
            setFilter(value);
            setOffset(0);
          }
        }}
      />
      <ViewTabs label="Businesses" grid={grid} onChange={setGrid} />
      {state.busy && <Text accessibilityLiveRegion="polite">Loading businesses…</Text>}
      {!!state.error && (
        <>
          <Text accessibilityRole="alert">{state.error}</Text>
          <Action label="Retry businesses" onPress={() => void request.model.run()} />
        </>
      )}
      {state.data &&
        (state.data.businesses.length ? (
          <BusinessDirectory
            onManage={(id, location) => void manage(id, location)}
            items={state.data.businesses}
            grid={grid}
          />
        ) : (
          <Text>No matching businesses.</Text>
        ))}
      {!!manageError && <Text accessibilityRole="alert">{manageError}</Text>}
      <Pagination
        label="businesses"
        offset={offset}
        hasMore={state.data?.hasMore ?? false}
        busy={state.busy}
        onChange={setOffset}
        {...(state.data ? { total: Number(state.data.total) } : {})}
      />
    </View>
  );
}
