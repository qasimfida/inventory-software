import { RecordDetails } from '@/components/common/RecordDetails';
import {
  businessNotificationDescription,
  businessNotificationDetails,
} from '@inventory/api-client';
import { ExportRecords } from '@/components/common/ExportRecords';
import { useState } from 'react';
import { FormSheet } from '@/components/common/FormSheet';
import type { createBusinessNotificationsClient } from '@inventory/api-client';
import { notificationTime, businessNotificationTitle } from '@inventory/api-client';
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
  onUnread,
  onDismiss,
}: {
  items: Inbox['notifications'];
  busy: boolean;
  timeZone: string;
  onRead: (id: string) => void;
  onUnread: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Inbox['notifications'][number] | null>(null);
  const detail = items.find((n) => n.id === selected?.id);
  return (
    <>
      <ExportRecords
        name="notifications-shown"
        headers={['Notification', 'Received', 'Status', 'Performed by']}
        rows={items.map((n) => [
          businessNotificationTitle(n.event, n.summary),
          businessTime(n.createdAt, timeZone),
          n.readAt ? 'Read' : 'Unread',
          n.actorName ?? 'Unavailable',
        ])}
      />

      <TableScroll label="Notification inbox">
        <Table>
          <thead>
            <tr>
              <th>Notification</th>
              <th>Received</th>
              <th>Status</th>
              <th>Performed by</th>
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
                    {businessNotificationTitle(n.event, n.summary)}
                  </Button>
                </th>
                <td>{notificationTime(n.createdAt, timeZone)}</td>
                <td>
                  <StatusBadge tone={n.readAt ? 'neutral' : 'info'}>
                    {n.readAt ? 'Read' : 'Unread'}
                  </StatusBadge>
                </td>
                <td>{n.actorName ?? 'Unavailable'}</td>
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
        description="Recorded business activity and your inbox status."
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {detail && (
          <>
            <h3>{businessNotificationTitle(detail.event, detail.summary)}</h3>
            <p className="text-muted-foreground">{businessNotificationDescription(detail.event)}</p>
            <StatusBadge tone={detail.readAt ? 'neutral' : 'info'}>
              {detail.readAt ? 'Read' : 'Unread'}
            </StatusBadge>
            <RecordDetails
              label="Notification context"
              items={businessNotificationDetails(detail, timeZone).map(([label, value]) => ({
                label,
                value,
              }))}
            />
            <div className="drawer-actions">
              <Button
                disabled={busy}
                onClick={() => (detail.readAt ? onUnread(detail.id) : onRead(detail.id))}
              >
                {detail.readAt ? 'Mark unread' : 'Mark read'}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => onDismiss(detail.id)}>
                Delete from my inbox
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This removes the notification from your inbox. Business audit history is preserved.
            </p>
          </>
        )}
      </FormSheet>
    </>
  );
}
