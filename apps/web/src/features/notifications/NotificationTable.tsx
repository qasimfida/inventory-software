import { useState } from 'react';
import { FormSheet } from '@/components/common/FormSheet';
import type { createBusinessNotificationsClient } from '@inventory/api-client';
import { businessNotificationTitle } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
type Inbox = Awaited<ReturnType<ReturnType<typeof createBusinessNotificationsClient>['inbox']>>;
export function NotificationTable({
  items,
  busy,
  timeZone,
  onRead,
}: {
  items: Inbox['notifications'];
  busy: boolean;
  timeZone: string;
  onRead: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Inbox['notifications'][number] | null>(null);
  const detail = items.find((n) => n.id === selected?.id);
  return (
    <>
      <TableScroll label="Notification inbox">
        <Table>
          <thead>
            <tr>
              <th>Notification</th>
              <th>Received</th>
              <th>Status</th>
              <th>Record reference</th>
              <th data-actions>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <th scope="row">
                  <Button
                    variant="ghost"
                    className="product-card-title"
                    onClick={() => setSelected(n)}
                  >
                    {businessNotificationTitle(n.event)}
                  </Button>
                </th>
                <td>{businessTime(n.createdAt, timeZone)}</td>
                <td>
                  <StatusBadge tone={n.readAt ? 'neutral' : 'info'}>
                    {n.readAt ? 'Read' : 'Unread'}
                  </StatusBadge>
                </td>
                <td className="break-all">{n.resourceId}</td>
                <td data-actions>
                  {!n.readAt && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => onRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
      <FormSheet
        title="Notification details"
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {detail && (
          <>
            <h3>{businessNotificationTitle(detail.event)}</h3>
            <StatusBadge tone={detail.readAt ? 'neutral' : 'info'}>
              {detail.readAt ? 'Read' : 'Unread'}
            </StatusBadge>
            <dl className="record-details">
              <dt>Received</dt>
              <dd>{businessTime(detail.createdAt, timeZone)}</dd>
              <dt>Event</dt>
              <dd>{detail.event}</dd>
              <dt>Record reference</dt>
              <dd>{detail.resourceId}</dd>
              <dt>Warehouse</dt>
              <dd>{detail.warehouseId ?? 'Business-wide'}</dd>
            </dl>
            {!detail.readAt && (
              <Button disabled={busy} onClick={() => onRead(detail.id)}>
                Mark read
              </Button>
            )}
          </>
        )}
      </FormSheet>
    </>
  );
}
