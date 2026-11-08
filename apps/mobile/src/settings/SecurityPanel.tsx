import { RecordDetails } from '../ui/RecordDetails';
import { RecordTable } from '../ui/RecordTable';
import {
  securityEventPresentation,
  securityEventDetails,
  securityTime,
  securityActor,
  type SecurityState,
} from '@inventory/api-client';
import { SecurityNotifications } from './SecurityNotifications';
import { SearchControl } from '../ui/SearchControl';
import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { Choice } from '../ui/Controls';
import { IconAction } from '../ui/IconAction';
import { useTheme } from '../theme';
import { CursorPagination } from '../ui/CursorPagination';
import { LoadingState, EmptyState, ErrorState } from '../ui/AsyncState';
import { ScreenHeader } from '../ui/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createSecurityClient, SecurityModel } from '@inventory/api-client';
import type { SecurityView } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action, styles } from '../ui/Controls';
import { Text } from '../ui/Themed';
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
  const source = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const theme = useTheme();
  const [search, setSearch] = useState(''),
    [outcome, setOutcome] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false),
    [details, setDetails] = useState<SecurityState['events'][number] | null>(null);
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
    <View
      style={[styles.group, { backgroundColor: theme.tokens.card, padding: theme.spacing.medium }]}
    >
      <ScreenHeader title="Security center" />
      {views
        .filter(
          (view) =>
            section === 'all' ||
            (section === 'notifications' ? view.key === 'inbox' : view.key !== 'inbox'),
        )
        .map((view) => (
          <Action
            key={view.key}
            label={view.label}
            disabled={state.busy}
            onPress={() => void model.load(view.key)}
          />
        ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <SearchControl
            label="Search loaded security records"
            value={search}
            onChange={setSearch}
          />
        </View>
        {(state.view === 'events' || state.view === 'platform') && (
          <FilterButton
            active={outcome ? [`Outcome: ${outcome}`] : []}
            onPress={() => setFiltersOpen(true)}
          />
        )}
        <IconAction
          label="Refresh security records"
          icon="↻"
          disabled={state.busy}
          onPress={() => void model.load(state.view)}
        />
      </View>
      <SidePanel title="Security filters" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Choice
          label="Outcome"
          value={outcome}
          options={['', 'success', 'denied', 'failure'].map((value) => ({
            value,
            label: value || 'All outcomes',
          }))}
          onChange={setOutcome}
        />
      </SidePanel>
      <SidePanel title="Security event details" open={!!details} onClose={() => setDetails(null)}>
        {details && (
          <View style={styles.group}>
            <Text>{securityEventPresentation(details.event).description}</Text>
            <RecordDetails
              label="Security event context"
              items={securityEventDetails(details).map(([label, value]) => ({ label, value }))}
            />
          </View>
        )}
      </SidePanel>
      {state.message ? (
        <ErrorState message={state.message} onRetry={() => void model.load(state.view)} />
      ) : null}
      {state.busy ? <LoadingState message="Loading security records…" /> : null}
      <Text>
        New-device alerts appear after in-app delivery. A marker identifies an installation, not a
        trusted person. Review and revoke sessions in Settings → Security.
      </Text>
      <SecurityNotifications
        items={state.notifications}
        busy={state.busy}
        onRead={(id) => void model.action(id)}
      />
      {state.events.map((event, index) => (
        <View
          key={event.id}
          style={{
            padding: theme.spacing.medium,
            backgroundColor: index % 2 === 0 ? theme.tokens.muted : theme.tokens.card,
          }}
        >
          <Text>
            {securityEventPresentation(event.event).title} ·{' '}
            {{ success: 'Successful', denied: 'Denied', failure: 'Failed' }[event.outcome]} ·{' '}
            {securityTime(event.occurredAt)}
          </Text>
          <Text>Actor: {securityActor(event)}</Text>
          <Action variant="ghost" label="View details" onPress={() => setDetails(event)} />
        </View>
      ))}
      {state.view === 'deliveries' && (
        <RecordTable
          label="Delivery attempts"
          columns={['Status', 'Attempts', 'Failure code', 'Delivery reference', 'Action']}
          rows={state.deliveries.map((item) => ({
            id: item.id,
            cells: [
              item.state,
              String(item.attempts),
              item.failureCode ?? 'Not recorded',
              item.id,
              item.state === 'failed' ? (
                <Action
                  key={item.id}
                  label="Retry notification"
                  disabled={state.busy}
                  onPress={() => void model.action(item.id, true)}
                />
              ) : null,
            ],
          }))}
        />
      )}
      {state.view === 'diagnostics' && (
        <RecordTable
          label="Diagnostics"
          columns={[
            'Code / operation',
            'Environment / version',
            'Reason / recovery',
            'Support reference',
          ]}
          rows={state.diagnostics.map((item) => ({
            id: item.id,
            cells: [
              item.code + ' · ' + item.operation,
              item.environment + ' / ' + item.applicationVersion,
              item.reason + ' · ' + item.recovery,
              item.requestId,
            ],
          }))}
        />
      )}
      {state.loaded &&
        !state.busy &&
        !state.message &&
        !state.notifications.length &&
        !state.events.length &&
        !state.deliveries.length &&
        !state.diagnostics.length && <EmptyState message="No records in this view." announce />}
      {state.nextCursor && (
        <CursorPagination
          label="security records"
          hasMore={Boolean(state.nextCursor)}
          busy={state.busy}
          onNext={() => void model.load(state.view, true)}
        />
      )}
    </View>
  );
}
