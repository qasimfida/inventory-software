import type { createBusinessNotificationsClient } from './business-notifications.js';
import { securityTime } from './security-presentation.js';
type Notification = Awaited<
  ReturnType<ReturnType<typeof createBusinessNotificationsClient>['inbox']>
>['notifications'][number];
/** Present only the already-authorized inbox record; opening details performs no request. */
export function businessNotificationDetails(
  item: Notification,
  timeZone: string,
): [string, string][] {
  const fields: [string, string][] = [
    ['Performed by', item.actorName || 'User information unavailable'],
    ['Date and time', securityTime(item.createdAt, true, timeZone)],
    ['Time zone', timeZone],
    ['Status', item.readAt ? 'Read' : 'Unread'],
  ];
  if (item.readAt) fields.push(['Read on', securityTime(item.readAt, true, timeZone)]);
  fields.push(['Scope', item.warehouseId ? 'Warehouse activity' : 'Business-wide activity']);
  if (item.warehouseId) fields.push(['Warehouse reference', item.warehouseId]);
  fields.push(['Record reference', item.resourceId], ['Notification reference', item.id]);
  return fields;
}
