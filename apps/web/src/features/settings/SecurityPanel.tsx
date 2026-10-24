import { SecurityEvents } from './SecurityEvents';
import { SearchControl } from '@/components/common/SearchControl';
import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Select } from '@/components/ui/FormControls';
import { RefreshCw } from 'lucide-react';
import { Table, TableScroll } from '@/components/ui/Table';
import { CursorPagination } from '@/components/common/CursorPagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createSecurityClient, SecurityModel } from '@inventory/api-client';
import type { SecurityView } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
export function SecurityPanel({
  platform,
  section = 'all',
}: {
  platform: boolean;
  section?: 'all' | 'security' | 'notifications';
}) {
  const model = useMemo(
    () => new SecurityModel(createSecurityClient(authClient.accountRequest)),
    [],
  );
  const source = useSyncExternalStore(model.subscribe, model.snapshot);
  const [search, setSearch] = useState(''),
    [outcome, setOutcome] = useState('');
  const matches = (value: unknown) =>
    JSON.stringify(value).toLowerCase().includes(search.toLowerCase());
  const state = {
    ...source,
    events: source.events.filter((e) => matches(e) && (!outcome || e.outcome === outcome)),
    notifications: source.notifications.filter(matches),
    deliveries: source.deliveries.filter(matches),
    diagnostics: source.diagnostics.filter(matches),
  };
  useEffect(() => {
    model.reset();
    if (section !== 'all') void model.load(section === 'notifications' ? 'inbox' : 'events');
    return () => model.reset();
  }, [model, platform, section]);
  const views: { key: SecurityView; label: string }[] = [
    { key: 'inbox', label: 'Security inbox' },
    { key: 'events', label: 'My security events' },
    ...(platform
      ? [
          { key: 'platform' as const, label: 'Platform security events' },
          { key: 'deliveries' as const, label: 'Notification delivery failures' },
          { key: 'diagnostics' as const, label: 'Restricted diagnostics' },
        ]
      : []),
  ];
  return (
    <section aria-label="Security center" className="screen-section collection-surface">
      <ScreenHeader title="Security center" level={3} />
      <div className="flex flex-wrap gap-2">
        {views
          .filter(
            (view) =>
              section === 'all' ||
              (section === 'notifications' ? view.key === 'inbox' : view.key !== 'inbox'),
          )
          .map((view) => (
            <Button
              variant="outline"
              key={view.key}
              disabled={state.busy}
              onClick={() => void model.load(view.key)}
            >
              {view.label}
            </Button>
          ))}
      </div>
      <div className="collection-toolbar">
        <div className="collection-search">
          <SearchControl
            label="Search loaded security records"
            value={search}
            onChange={setSearch}
          />
        </div>
        {(state.view === 'events' || state.view === 'platform') && (
          <Popover>
            <PopoverTrigger asChild>
              <FilterButton active={outcome ? [`Outcome: ${outcome}`] : []} />
            </PopoverTrigger>
            <PopoverContent>
              <Select
                aria-label="Security outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="">All outcomes</option>
                {['success', 'denied', 'failure'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </PopoverContent>
          </Popover>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh security records"
          disabled={state.busy}
          onClick={() => void model.load(state.view)}
        >
          <RefreshCw />
        </Button>
      </div>
      {state.message && (
        <ErrorState message={state.message} onRetry={() => void model.load(state.view)} />
      )}
      {state.busy && <LoadingState message="Loading security records…" />}
      <p>
        New-device alerts are available here after in-app delivery completes. A marker identifies an
        installation, not a trusted person. Review and revoke sessions in Settings → Security.
      </p>
      {state.view === 'inbox' && (
        <TableScroll label="Security notifications">
          <Table>
            <thead>
              <tr>
                <th>Security notifications</th>
              </tr>
            </thead>
            <tbody>
              {state.notifications.map((item) => (
                <tr key={item.id}>
                  <td>
                    New device · {new Date(item.occurredAt).toLocaleString()} · {item.audience} ·
                    Account {item.actorId} · Device {item.deviceId}
                    {item.businessId && <span> · Business {item.businessId}</span>}
                    {item.readAt ? (
                      <p>Read</p>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={state.busy}
                        onClick={() => void model.action(item.id)}
                      >
                        Mark notification read
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      {(state.view === 'events' || state.view === 'platform') && (
        <SecurityEvents events={state.events} />
      )}
      {state.view === 'deliveries' && (
        <TableScroll label="Delivery attempts">
          <Table>
            <thead>
              <tr>
                <th>Delivery attempts</th>
              </tr>
            </thead>
            <tbody>
              {state.deliveries.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.state} · Attempts {item.attempts} · {item.failureCode ?? 'Queued'} ·{' '}
                    {item.id}
                    {item.state === 'failed' && (
                      <Button
                        disabled={state.busy}
                        onClick={() => void model.action(item.id, true)}
                      >
                        Retry notification
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      {state.view === 'diagnostics' && (
        <TableScroll label="Diagnostics">
          <Table>
            <thead>
              <tr>
                <th>Diagnostics</th>
              </tr>
            </thead>
            <tbody>
              {state.diagnostics.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.code} · {item.operation} · {item.environment}/{item.applicationVersion} ·{' '}
                    {item.reason} · {item.recovery} · Reference {item.requestId}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      {state.loaded &&
        !state.busy &&
        !state.message &&
        !state.notifications.length &&
        !state.events.length &&
        !state.deliveries.length &&
        !state.diagnostics.length && (
          <EmptyState
            message="No records in this view."
            description="Try another search or outcome filter. Search covers loaded records only."
            announce
          />
        )}
      {state.nextCursor && (
        <CursorPagination
          label="security records"
          hasMore={Boolean(state.nextCursor)}
          busy={state.busy}
          onNext={() => void model.load(state.view, true)}
        />
      )}
    </section>
  );
}
