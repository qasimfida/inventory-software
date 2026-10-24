import { FilterButton } from '../ui/FilterButton';
import { useTheme } from '../theme';
import { Choice } from '../ui/Controls';
import { EmptyState } from '../ui/AsyncState';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { View } from 'react-native';
import { useState } from 'react';
import { SidePanel } from '../ui/SidePanel';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { RecordTable } from '../ui/RecordTable';
import { businessTime } from '@inventory/contracts';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import type { OrganizationView } from '@inventory/api-client';
export function AuditHistory({
  events,
  timeZone,
  onRefresh,
  busy = false,
}: {
  events: OrganizationView['events'];
  timeZone: string;
  onRefresh?: (() => void) | undefined;
  busy?: boolean;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const shown = events.filter(
    (event) =>
      (!action || event.action === action) &&
      (!actor || event.actorId === actor) &&
      [
        event.action,
        event.actorEmail,
        event.actorId,
        event.resourceId,
        event.storeId,
        event.warehouseId,
      ].some((value) => value?.toLowerCase().includes(search.toLowerCase())),
  );
  const [selected, setSelected] = useState<OrganizationView['events'][number] | null>(null);
  return (
    <ScreenBody>
      <View
        style={{
          backgroundColor: theme.tokens.card,
          padding: theme.spacing.medium,
          borderRadius: theme.radius,
        }}
      >
        <ScreenHeader title="Audit history" />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <SearchControl label="Search loaded audit events" value={search} onChange={setSearch} />
          </View>
          <FilterButton
            active={[
              action && `Action: ${action}`,
              actor && `User: ${events.find((e) => e.actorId === actor)?.actorEmail ?? actor}`,
            ].filter((v): v is string => Boolean(v))}
            onPress={() => setFiltersOpen(true)}
          />
          {onRefresh && (
            <IconAction
              label="Refresh business logs"
              icon="↻"
              disabled={busy}
              onPress={onRefresh}
            />
          )}
        </View>
        <SidePanel title="Audit filters" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
          <Choice
            label="Action filter (loaded events)"
            value={action}
            options={[
              { value: '', label: 'All actions' },
              ...[...new Set(events.map((e) => e.action))].map((value) => ({
                value,
                label: value,
              })),
            ]}
            onChange={setAction}
          />
          <Choice
            label="User filter (loaded events)"
            value={actor}
            options={[
              { value: '', label: 'All users' },
              ...[
                ...new Map(
                  events.map((e) => [
                    e.actorId,
                    { value: e.actorId, label: e.actorEmail ?? e.actorId },
                  ]),
                ).values(),
              ],
            ]}
            onChange={setActor}
          />
        </SidePanel>
        {!shown.length && (
          <EmptyState
            message="No matching audit events"
            description="Try a different search, action or user filter. Only loaded audit events are searched."
          />
        )}
        <RecordTable
          label="Audit history"
          columns={['Time / event', 'Actor / target', 'Store / warehouse', 'Change details']}
          rows={shown.map((event) => ({
            id: event.id,
            cells: [
              `${businessTime(event.occurredAt, timeZone)} · ${event.action}`,
              `${event.actorEmail ?? event.actorId} · ${event.resourceId}`,
              `${event.storeId ?? 'Business-wide'} · ${event.warehouseId ?? '—'}`,
              <Action
                key={event.id}
                variant="ghost"
                label="View change details"
                onPress={() => setSelected(event)}
              />,
            ],
          }))}
        />
        <SidePanel title="Activity details" open={!!selected} onClose={() => setSelected(null)}>
          {selected && (
            <>
              <Text accessibilityRole="header">{selected.action}</Text>
              <Text>{businessTime(selected.occurredAt, timeZone)}</Text>
              <Text>Actor: {selected.actorEmail ?? selected.actorId}</Text>
              <Text>Record: {selected.resourceId}</Text>
              <Text>Store: {selected.storeId ?? 'Business-wide'}</Text>
              <Text>Warehouse: {selected.warehouseId ?? '—'}</Text>
              <Text>
                {JSON.stringify({ before: selected.before, after: selected.after }, null, 2)}
              </Text>
            </>
          )}
        </SidePanel>
      </View>
    </ScreenBody>
  );
}
