import { RecordDetails } from '../ui/RecordDetails';
import { useState } from 'react';
import type { SecurityNotification } from '@inventory/contracts';
import { securityTime, securityActor } from '@inventory/api-client';
import { RecordCollection } from '../ui/RecordCollection';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
export function SecurityNotifications({
  items,
  busy,
  onRead,
}: {
  items: SecurityNotification[];
  busy: boolean;
  onRead: (id: string) => void;
}) {
  const [id, setId] = useState('');
  const detail = items.find((item) => item.id === id);
  return (
    <>
      <RecordCollection
        label="security notifications"
        onOpen={setId}
        items={items.map((item) => ({
          id: item.id,
          title: 'New device sign-in',
          subtitle: securityTime(item.occurredAt),
          detail: item.businessId ? 'Business security alert' : 'Account security alert',
          status: item.readAt ? 'Read' : 'Unread',
          tone: item.readAt ? 'neutral' : 'warning',
        }))}
      />
      <SidePanel title="New device sign-in" open={!!detail} onClose={() => setId('')}>
        {detail && (
          <>
            <Text>
              A sign-in was recorded from a new device. If you do not recognize it, review and
              revoke the session in Security settings.
            </Text>
            <RecordDetails
              label="Sign-in context"
              items={[
                { label: 'Date and time', value: securityTime(detail.occurredAt, true) },
                { label: 'User', value: securityActor(detail) },
                { label: 'Device reference', value: detail.deviceId },
              ]}
            />
            <Text>A device identifier identifies an installation, not a verified person.</Text>
            {!detail.readAt && (
              <Action label="Mark read" disabled={busy} onPress={() => onRead(detail.id)} />
            )}
          </>
        )}
      </SidePanel>
    </>
  );
}
