import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { SearchControl } from '@/components/common/SearchControl';
import { Select } from '@/components/ui/FormControls';
import { NotificationTable } from './NotificationTable';
import { CursorPagination } from '@/components/common/CursorPagination';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createBusinessNotificationsClient,
  ResourceModel,
  businessNotificationTitle,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState, ErrorState } from '@/components/common/AsyncState';
import { ApprovalReview } from './ApprovalReview';
export function NotificationsPanel({ business }: { business: Business }) {
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState<'all' | 'read' | 'unread'>('all');

  const [cursor, setCursor] = useState<string>(),
    [offset, setOffset] = useState(0),
    [review, setReview] = useState<{ id: string; kind: 'purchase' | 'transfer' | 'count' }>();
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setCursor(undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const client = useMemo(
    () => createBusinessNotificationsClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const admin = hasPermission(business, 'business.write');
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        inbox: await client.inbox(cursor, { search: query, status }),
        queue: await client.approvals(offset),
        failures: admin ? await client.failures() : null,
      })),
    [client, cursor, offset, admin, query, status],
  );
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, query, status],
    [offset, cursor],
    ['inbox.notifications', 'queue.items'],
    () => {
      setOffset(0);
      setCursor(undefined);
    },
  );
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <section
      aria-label="Business notifications and approvals"
      className="screen-section collection-surface"
    >
      <ScreenHeader
        title="Notifications and approvals"
        description={
          <>
            In-app delivery may take a few seconds. Security alerts remain in Account settings.
            Refresh to check for new events.
          </>
        }
      />
      <div className="collection-toolbar">
        <div className="collection-search">
          <SearchControl
            label="Search notification events or references"
            value={search}
            onChange={setSearch}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <FilterButton active={status === 'all' ? [] : [`Status: ${status}`]} />
          </PopoverTrigger>
          <PopoverContent>
            <Select
              aria-label="Read status"
              value={status}
              onChange={(e) => {
                setStatus(
                  e.target.value === 'read'
                    ? 'read'
                    : e.target.value === 'unread'
                      ? 'unread'
                      : 'all',
                );
                setCursor(undefined);
              }}
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </Select>
          </PopoverContent>
        </Popover>
        <Button
          disabled={state.busy}
          onClick={() => void model.run()}
          variant="ghost"
          size="icon"
          aria-label="Refresh notifications"
        >
          <RefreshCw />
        </Button>
      </div>
      {state.busy && <LoadingState message="Loading notifications…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.data && (
        <>
          <h3>Inbox</h3>
          {!state.data.inbox.notifications.length && (
            <EmptyState
              message={
                search || status !== 'all' ? 'No matching notifications' : 'You’re all caught up'
              }
              description={
                search || status !== 'all'
                  ? 'Try another search or clear the read-status filter.'
                  : 'New business notifications will appear here when events are delivered.'
              }
            />
          )}
          <NotificationTable
            items={state.data.inbox.notifications}
            busy={state.busy}
            timeZone={business.timeZone ?? 'UTC'}
            onRead={(id) => void model.run(() => client.read(id))}
          />
          <div className="flex flex-wrap gap-2">
            <CursorPagination
              label="notifications"
              previous={Boolean(cursor)}
              hasMore={Boolean(state.data.inbox.nextCursor)}
              busy={state.busy || Boolean(state.error)}
              onReset={() => setCursor(undefined)}
              onNext={() => setCursor(state.data?.inbox.nextCursor ?? undefined)}
            />
          </div>
          <h3>Awaiting approval</h3>
          {!state.data.queue.items.length && (
            <EmptyState message="No pending approvals in your scope." />
          )}
          {state.data.queue.items.map((item) => (
            <div key={item.id} className="space-y-2 border p-3">
              <p>
                {item.kind} · {item.reference} · {item.state}
              </p>
              <p className="break-all">Warehouse {item.warehouseId}</p>
              <Button onClick={() => setReview(item)}>Review {item.reference}</Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Pagination
              label="approvals"
              offset={offset}
              pageSize={50}
              hasMore={state.data.queue.hasMore}
              busy={state.busy || Boolean(state.error)}
              onChange={setOffset}
            />
          </div>
          {!!state.data.failures?.deliveries.length && (
            <>
              <h3>Delivery status</h3>
              {state.data.failures.deliveries.map((d) => (
                <div key={d.id}>
                  <p>
                    {businessNotificationTitle(d.event)}: {d.state}, attempt {d.attempts} ·{' '}
                    {d.failureCode}
                  </p>
                  {d.state === 'failed' && (
                    <Button onClick={() => void model.run(() => client.retry(d.id))}>
                      Retry {businessNotificationTitle(d.event)}
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}
      {review && (
        <>
          <Button onClick={() => setReview(undefined)}>Close approval review</Button>
          <ApprovalReview
            key={review.id}
            businessId={business.id}
            item={review}
            onDone={() => void model.run()}
          />
        </>
      )}
    </section>
  );
}
