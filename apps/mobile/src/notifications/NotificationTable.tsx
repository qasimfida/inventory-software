import { useState } from 'react';
import { businessTime } from '@inventory/contracts';
import type { createBusinessNotificationsClient } from '@inventory/api-client';
import { businessNotificationTitle } from '@inventory/api-client';
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
}: {
  items: Inbox['notifications'];
  busy: boolean;
  timeZone: string;
  onRead: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = items.find((item) => item.id === selectedId);
  return (
    <>
      <RecordTable
        label="Notification inbox"
        columns={['Notification', 'Received', 'Status', 'Reference', 'Action']}
        rows={items.map((n) => ({
          id: n.id,
          cells: [
            <Action
              key={n.id}
              variant="ghost"
              label={businessNotificationTitle(n.event)}
              onPress={() => setSelectedId(n.id)}
            />,
            businessTime(n.createdAt, timeZone),
            n.readAt ? 'Read' : 'Unread',
            n.resourceId,
            n.readAt ? null : (
              <Action key={n.id} label="Mark read" disabled={busy} onPress={() => onRead(n.id)} />
            ),
          ],
        }))}
      />
      <SidePanel title="Notification details" open={!!detail} onClose={() => setSelectedId(null)}>
        {detail && (
          <>
            <Text accessibilityRole="header">{businessNotificationTitle(detail.event)}</Text>
            <Text>{detail.readAt ? 'Read' : 'Unread'}</Text>
            <Text>Received: {businessTime(detail.createdAt, timeZone)}</Text>
            <Text>Record: {detail.resourceId}</Text>
            <Text>Warehouse: {detail.warehouseId ?? 'Business-wide'}</Text>
            {!detail.readAt && (
              <Action label="Mark read" disabled={busy} onPress={() => onRead(detail.id)} />
            )}
          </>
        )}
      </SidePanel>
    </>
  );
}
