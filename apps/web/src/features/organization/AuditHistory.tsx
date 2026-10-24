import { Select } from '@/components/ui/FormControls';
import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { EmptyState } from '@/components/common/AsyncState';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { Table, TableScroll } from '@/components/ui/Table';
import { useState } from 'react';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { businessTime } from '@inventory/contracts';
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
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
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
    <section aria-label="Audit history" className="screen-section collection-surface">
      <ScreenHeader title="Audit history" level={3} />
      <div className="collection-toolbar">
        <div className="collection-search">
          <SearchControl
            label="Search loaded audit events"
            value={search}
            onChange={setSearch}
            emptyMessage="No matching loaded events."
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <FilterButton
              active={[
                action && `Action: ${action}`,
                actor && `User: ${events.find((e) => e.actorId === actor)?.actorEmail ?? actor}`,
              ].filter((value): value is string => Boolean(value))}
            />
          </PopoverTrigger>
          <PopoverContent className="space-y-3">
            <label>
              Action (loaded events)
              <Select value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">All actions</option>
                {[...new Set(events.map((e) => e.action))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </label>
            <label>
              User (loaded events)
              <Select value={actor} onChange={(e) => setActor(e.target.value)}>
                <option value="">All users</option>
                {[...new Map(events.map((e) => [e.actorId, e])).values()].map((e) => (
                  <option key={e.actorId} value={e.actorId}>
                    {e.actorEmail ?? e.actorId}
                  </option>
                ))}
              </Select>
            </label>
          </PopoverContent>
        </Popover>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh business logs"
            disabled={busy}
            onClick={onRefresh}
          >
            <RefreshCw />
          </Button>
        )}
      </div>
      {!shown.length && (
        <EmptyState
          message="No matching audit events"
          description="Try a different search, action or user filter. Only loaded audit events are searched."
        />
      )}
      <TableScroll label="Activity log">
        <Table>
          <thead>
            <tr>
              <th>Time / event</th>
              <th>Actor / record</th>
              <th>Scope</th>
              <th>Change details</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((event) => (
              <tr key={event.id}>
                <td>
                  <p>
                    {businessTime(event.occurredAt, timeZone)} · {event.action}
                  </p>
                </td>
                <td>
                  <p>
                    Actor: {event.actorEmail ?? event.actorId} · Target: {event.resourceId}
                  </p>
                </td>
                <td>
                  <p>
                    Store: {event.storeId ?? 'Business scope'} · Warehouse:{' '}
                    {event.warehouseId ?? 'None'}
                  </p>
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                    View change details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
      <FormSheet
        title="Activity details"
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <>
            <h3>{selected.action}</h3>
            <dl className="record-details">
              <dt>Time</dt>
              <dd>{businessTime(selected.occurredAt, timeZone)}</dd>
              <dt>Actor</dt>
              <dd>{selected.actorEmail ?? selected.actorId}</dd>
              <dt>Record</dt>
              <dd>{selected.resourceId}</dd>
              <dt>Store</dt>
              <dd>{selected.storeId ?? 'Business-wide'}</dd>
              <dt>Warehouse</dt>
              <dd>{selected.warehouseId ?? '—'}</dd>
            </dl>
            <h4>Recorded changes</h4>
            <pre className="overflow-auto text-xs">
              {JSON.stringify({ before: selected.before, after: selected.after }, null, 2)}
            </pre>
          </>
        )}
      </FormSheet>
    </section>
  );
}
