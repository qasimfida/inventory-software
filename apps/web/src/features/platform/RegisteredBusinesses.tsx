import { FilterButton } from '@/components/common/FilterButton';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { AddBusiness } from '@/features/organization/AddBusiness';
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { createPlatformBusinessesClient, cancellableResource } from '@inventory/api-client';
import { type PlatformBusinessesQuery } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SearchControl } from '@/components/common/SearchControl';
import { ViewTabs } from '@/components/common/ViewTabs';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/AsyncState';
import { Select } from '@/components/ui/FormControls';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { BusinessDirectory } from './BusinessDirectory';
export function RegisteredBusinesses() {
  const { model: workspaceModel } = useWorkspace();
  const navigate = useNavigate();
  const [manageError, setManageError] = useState('');
  async function manage(id: string, location: boolean) {
    setManageError('');
    await workspaceModel.select(id);
    if (workspaceModel.snapshot().workspace?.business.id === id)
      void navigate(location ? '/settings/locations' : '/settings/business');
    else
      setManageError('Unable to open this workspace. It may be inactive or no longer accessible.');
  }

  const panelId = useId();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState<NonNullable<PlatformBusinessesQuery['state']>>('all'),
    [offset, setOffset] = useState(0),
    [view, setView] = useState<'list' | 'grid'>('list');
  const [revision, setRevision] = useState(0);
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
    <section className="screen-section" aria-label="Registered businesses">
      <ScreenHeader
        title="Registered businesses"
        description="Browse business registrations and their stores and warehouses."
        actions={
          <AddBusiness
            onCreated={() => {
              setOffset(0);
              setRevision((value) => value + 1);
            }}
          />
        }
      />
      <div className="inventory-controls">
        <SearchControl
          label="Search registered businesses"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setOffset(0);
          }}
          busy={state.busy}
          suggestions={state.data?.businesses.map((b) => ({ value: b.name, label: b.name })) ?? []}
          emptyMessage="No matching registered businesses."
        />
        <Popover>
          <PopoverTrigger asChild>
            <FilterButton active={filter === 'all' ? [] : [`Status: ${filter}`]} />
          </PopoverTrigger>
          <PopoverContent>
            <label htmlFor="directory-business-status">
              Business status
              <Select
                id="directory-business-status"
                aria-label="Business status"
                value={filter}
                onChange={(e) => {
                  const value = e.target.value;
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
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </Select>
            </label>
          </PopoverContent>
        </Popover>
        <ViewTabs panelId={panelId} label="Businesses" value={view} onChange={setView} />
      </div>
      {state.error && <ErrorState message={state.error} onRetry={() => void request.model.run()} />}
      {state.busy && <LoadingState message="Loading businesses…" />}
      <div id={panelId} role="tabpanel" aria-label={`Businesses ${view} view`} tabIndex={0}>
        {state.data &&
          (state.data.businesses.length ? (
            <BusinessDirectory
              onManage={(id, location) => void manage(id, location)}
              items={state.data.businesses}
              grid={view === 'grid'}
            />
          ) : (
            <EmptyState message="No matching businesses." />
          ))}
      </div>
      {manageError && <p role="alert">{manageError}</p>}
      <Pagination
        label="businesses"
        offset={offset}
        hasMore={state.data?.hasMore ?? false}
        busy={state.busy}
        onChange={setOffset}
        {...(state.data ? { total: Number(state.data.total) } : {})}
      />
    </section>
  );
}
