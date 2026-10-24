import { queryString } from './catalog.js';
import {
  businessInboxSchema,
  approvalQueueSchema,
  businessFailuresSchema,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
export function createBusinessNotificationsClient(
  request: OrganizationTransport,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/notifications`;
  return {
    inbox: async (
      cursor?: string,
      filters: { search?: string; status?: 'all' | 'read' | 'unread' } = {},
    ) => businessInboxSchema.parse(await request(`${path}?${queryString({ ...filters, cursor })}`)),
    read: (id: string) => request(`${path}/${encodeURIComponent(id)}/read`, 'POST'),
    approvals: async (offset = 0) =>
      approvalQueueSchema.parse(await request(`${path}/approvals?offset=${offset}`)),
    failures: async () => businessFailuresSchema.parse(await request(`${path}/failures`)),
    retry: (id: string) => request(`${path}/${encodeURIComponent(id)}/retry`, 'POST'),
  };
}
const notificationTitles: Record<string, string> = {
  'purchase.created': 'Purchase awaiting approval',
  'purchase.approve': 'Purchase approved',
  'purchase.cancel': 'Purchase cancelled',
  'count.submit': 'Stock count awaiting review',
  'count.approved': 'Stock count reconciled',
  'transfer.created': 'Transfer awaiting approval',
  'transfer.approve': 'Transfer approved',
  'transfer.dispatch': 'Transfer dispatched',
  'transfer.receive': 'Transfer received',
  'transfer.cancel': 'Transfer cancelled',
  'stock.low': 'Low stock',
  'stock.movement': 'Stock movement recorded',
  'sale.return': 'Sale returned',
  'sale.exchange': 'Exchange recorded',
  'sale.void': 'Sale voided',
  'settings.policy_changed': 'Business settings changed',
};
export function businessNotificationTitle(event: string) {
  return notificationTitles[event] ?? 'Business activity';
}
