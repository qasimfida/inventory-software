import { RecordDetails } from '../ui/RecordDetails';
import {
  businessNotificationDescription,
  businessNotificationDetails,
} from '@inventory/api-client';
import { ExportRecords } from '../ui/ExportRecords';
import { useState } from 'react';
import { businessTime } from '@inventory/contracts';
import type { createBusinessNotificationsClient } from '@inventory/api-client';
import { notificationTime, businessNotificationTitle } from '@inventory/api-client';
import { RecordTable } from '../ui/RecordTable';
import { SidePanel } from '../ui/SidePanel';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = items.find((item) => item.id === selectedId);
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

      <RecordTable
        label="Notification inbox"
        columns={['Notification', 'Received', 'Status', 'By', 'Action']}
        rows={items.map((n) => ({
          id: n.id,
          cells: [
            <Action
              key={n.id}
              variant="ghost"
              label={businessNotificationTitle(n.event, n.summary)}
              onPress={() => setSelectedId(n.id)}
            />,
            notificationTime(n.createdAt, timeZone),
            n.readAt ? 'Read' : 'Unread',
            n.actorName ?? 'Unavailable',
            n.readAt ? null : (
              <Action key={n.id} label="Mark read" disabled={busy} onPress={() => onRead(n.id)} />
            ),
          ],
        }))}
      />
      <SidePanel title="Notification details" open={!!detail} onClose={() => setSelectedId(null)}>
        {detail && (
          <>
            <Text accessibilityRole="header">
              {businessNotificationTitle(detail.event, detail.summary)}
            </Text>
            <Text>{businessNotificationDescription(detail.event)}</Text>
            <Text>{detail.readAt ? 'Read' : 'Unread'}</Text>
            <RecordDetails
              label="Notification context"
              items={businessNotificationDetails(detail, timeZone).map(([label, value]) => ({
                label,
                value,
              }))}
            />
            <Action
              label={detail.readAt ? 'Mark unread' : 'Mark read'}
              disabled={busy}
              onPress={() => (detail.readAt ? onUnread(detail.id) : onRead(detail.id))}
            />
            <Action
              label="Delete from my inbox"
              disabled={busy}
              onPress={() => onDismiss(detail.id)}
            />
            <Text>Deleting from your inbox preserves the business audit history.</Text>
          </>
        )}
      </SidePanel>
    </>
  );
}
