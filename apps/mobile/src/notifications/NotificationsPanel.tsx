import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { useTheme } from '../theme';
import { SearchControl } from '../ui/SearchControl';
import { SelectChoice } from '../ui/SelectChoice';
import { NotificationTable } from './NotificationTable';
import { CursorPagination } from '../ui/CursorPagination';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { LoadingState, EmptyState, ErrorState } from '../ui/AsyncState';
import { ScreenBody } from '../ui/ScreenHeader';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import {
  createBusinessNotificationsClient,
  ResourceModel,
  businessNotificationTitle,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ApprovalReview } from './ApprovalReview';
export function NotificationsPanel({
  business,
  page = false,
}: {
  business: Business;
  page?: boolean;
}) {
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState<'all' | 'read' | 'unread'>('all');

  const [open, setOpen] = useState(page),
    [cursor, setCursor] = useState<string>(),
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
    ),
    admin = hasPermission(business, 'business.write');
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        inbox: await client.inbox(cursor, { search: query, status }),
        queue: await client.approvals(offset),
        failures: admin ? await client.failures() : null,
      })),
    [client, cursor, offset, admin, query, status],
  );
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
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
    if (open) void model.run();
    return model.reset;
  }, [model, open]);
  return (
    <ScreenBody>
      <View
        style={{
          backgroundColor: theme.tokens.card,
          padding: theme.spacing.medium,
          borderRadius: theme.radius,
        }}
      >
        <DisclosureTrigger
          expanded={open}
          label="Notifications and approvals"
          onPress={() => setOpen(!open)}
        />
        {open && (
          <>
            <Text>
              In-app delivery may take a few seconds. Security alerts remain in Account settings.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={{ flex: 1 }}>
                <SearchControl
                  label="Search notification events or references"
                  value={search}
                  onChange={setSearch}
                />
              </View>
              <FilterButton
                active={status === 'all' ? [] : [`Status: ${status}`]}
                onPress={() => setFiltersOpen(true)}
              />
              <IconAction
                label="Refresh notifications"
                disabled={state.busy}
                onPress={() => void model.run()}
                icon="↻"
              />
            </View>
            <SidePanel
              title="Notification filters"
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
            >
              <SelectChoice
                label="Read status"
                value={status}
                options={['all', 'unread', 'read'].map((value) => ({ value, label: value }))}
                onChange={(v) => {
                  setStatus(v === 'read' ? 'read' : v === 'unread' ? 'unread' : 'all');
                  setCursor(undefined);
                }}
              />
            </SidePanel>
            {state.busy && <LoadingState message="Loading notifications…" />}
            {!!state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
            {state.data && (
              <>
                <Text accessibilityRole="header">Inbox</Text>
                {!state.data.inbox.notifications.length && (
                  <EmptyState
                    message={
                      search || status !== 'all'
                        ? 'No matching notifications'
                        : 'You’re all caught up'
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

                <CursorPagination
                  label="notifications"
                  previous={Boolean(cursor)}
                  hasMore={Boolean(state.data.inbox.nextCursor)}
                  busy={state.busy || Boolean(state.error)}
                  onReset={() => setCursor(undefined)}
                  onNext={() => setCursor(state.data?.inbox.nextCursor ?? undefined)}
                />
                <Text accessibilityRole="header">Awaiting approval</Text>
                {!state.data.queue.items.length && (
                  <EmptyState message="No pending approvals in your scope." />
                )}
                {state.data.queue.items.map((item) => (
                  <View key={item.id}>
                    <Text>
                      {item.kind} · {item.reference} · {item.state} · warehouse {item.warehouseId}
                    </Text>
                    <Action label={`Review ${item.reference}`} onPress={() => setReview(item)} />
                  </View>
                ))}

                <Pagination
                  label="approvals"
                  offset={offset}
                  pageSize={50}
                  hasMore={state.data.queue.hasMore}
                  busy={state.busy || Boolean(state.error)}
                  onChange={setOffset}
                />
                {state.data.failures?.deliveries.map((d) => (
                  <View key={d.id}>
                    <Text>
                      {businessNotificationTitle(d.event)}: {d.state}, attempt {d.attempts} ·{' '}
                      {d.failureCode}
                    </Text>
                    {d.state === 'failed' && (
                      <Action
                        label={`Retry ${businessNotificationTitle(d.event)}`}
                        onPress={() => void model.run(() => client.retry(d.id))}
                      />
                    )}
                  </View>
                ))}
              </>
            )}
            {review && (
              <>
                <Action label="Close approval review" onPress={() => setReview(undefined)} />
                <ApprovalReview
                  key={review.id}
                  businessId={business.id}
                  item={review}
                  onDone={() => void model.run()}
                />
              </>
            )}
          </>
        )}
      </View>
    </ScreenBody>
  );
}
