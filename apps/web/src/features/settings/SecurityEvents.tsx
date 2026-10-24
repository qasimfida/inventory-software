import { useState } from 'react';
import type { SecurityState } from '@inventory/api-client';
import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/common/FormSheet';
import { StatusBadge } from '@/components/ui/StatusBadge';
export function SecurityEvents({ events }: { events: SecurityState['events'] }) {
  const [selected, setSelected] = useState<SecurityState['events'][number] | null>(null);
  return (
    <>
      <TableScroll label="Security events">
        <Table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Time</th>
              <th>Actor</th>
              <th>Outcome</th>
              <th data-actions>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <th scope="row">{event.event}</th>
                <td>{new Date(event.occurredAt).toLocaleString()}</td>
                <td>{event.actorId ?? 'Unauthenticated request'}</td>
                <td>
                  <StatusBadge tone={event.outcome === 'success' ? 'success' : 'warning'}>
                    {event.outcome}
                  </StatusBadge>
                </td>
                <td data-actions>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                    View details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
      <FormSheet
        title="Security event details"
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <pre className="whitespace-pre-wrap break-all text-sm">
            {JSON.stringify(selected, null, 2)}
          </pre>
        )}
      </FormSheet>
    </>
  );
}
