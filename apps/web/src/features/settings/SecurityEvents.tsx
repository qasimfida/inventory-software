import { RecordDetails } from '@/components/common/RecordDetails';
import { useState } from 'react';
import {
  securityEventPresentation,
  securityEventDetails,
  securityTime,
  securityActor,
} from '@inventory/api-client';
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
                <th scope="row">{securityEventPresentation(event.event).title}</th>
                <td>{securityTime(event.occurredAt)}</td>
                <td>{securityActor(event)}</td>
                <td>
                  <StatusBadge
                    tone={
                      event.outcome === 'success'
                        ? 'success'
                        : event.outcome === 'failure'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {{ success: 'Successful', denied: 'Denied', failure: 'Failed' }[event.outcome]}
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
        description="Recorded outcome, actor and security context."
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <>
            <p>{securityEventPresentation(selected.event).description}</p>
            <RecordDetails
              label="Security event context"
              items={securityEventDetails(selected).map(([label, value]) => ({ label, value }))}
            />
          </>
        )}
      </FormSheet>
    </>
  );
}
