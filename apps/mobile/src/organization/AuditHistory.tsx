import { businessTime } from '@inventory/contracts';
import { Text, View } from 'react-native';
import type { OrganizationView } from '@inventory/api-client';
export function AuditHistory({
  events,
  timeZone,
}: {
  events: OrganizationView['events'];
  timeZone: string;
}) {
  return (
    <View>
      <Text accessibilityRole="header">Audit history</Text>
      {events.map((event) => (
        <View key={event.id}>
          <Text>
            {businessTime(event.occurredAt, timeZone)} · {event.action}
          </Text>
          <Text>
            Actor: {event.actorId} · Target: {event.resourceId}
          </Text>
          <Text>
            Store: {event.storeId ?? 'Business scope'} · Warehouse: {event.warehouseId ?? 'None'}
          </Text>
          <Text>
            Before: {JSON.stringify(event.before)} After: {JSON.stringify(event.after)}
          </Text>
        </View>
      ))}
    </View>
  );
}
