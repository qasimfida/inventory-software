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
    unread: (id: string) => request(`${path}/${encodeURIComponent(id)}/unread`, 'POST'),
    dismiss: (id: string) => request(`${path}/${encodeURIComponent(id)}/dismiss`, 'POST'),
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
export function businessNotificationTitle(event: string, summary?: string) {
  return (
    summary ||
    notificationTitles[event] ||
    (event === 'storefront.readiness_batch'
      ? 'Online store readiness changed'
      : 'Business activity')
  );
}

/** Explain the recorded event without inventing quantities, names or posting effects. */
export function businessNotificationDescription(event: string) {
  const descriptions: Record<string, string> = {
    'transfer.receive':
      'A warehouse transfer was received. Its receipt and stock movements are recorded in transfer history.',
    'transfer.dispatch':
      'A warehouse transfer was dispatched. Review transfer history for the items sent and receiving location.',
    'transfer.approve':
      'A warehouse transfer was approved. Approval alone does not mean the goods have been dispatched or received.',
    'transfer.cancel':
      'A warehouse transfer was cancelled. Review its history for the recorded reason.',
    'stock.low':
      'Stock has reached the configured low-stock threshold. Review current availability before arranging replenishment.',
    'storefront.readiness_batch':
      'Online store listing readiness changed. Review the affected listings and their current publication requirements.',
  };
  if (descriptions[event]) return descriptions[event];
  if (event.startsWith('transfer.'))
    return 'A warehouse transfer changed. Review its transfer history for the locations, items and confirmed movement records.';
  if (event.startsWith('purchase.'))
    return 'A purchase order changed. Open purchasing to review its supplier, receipt history and approval status.';
  if (event.startsWith('count.'))
    return 'A stock count changed. Review the count observations and reconciliation history before taking further action.';
  if (event.startsWith('stock.'))
    return 'Inventory activity was recorded. Review the movement ledger for affected items, quantities, locations and reasons.';
  if (event.startsWith('sale.'))
    return 'A sales correction was recorded. Review the original receipt and linked return, refund or replacement records.';
  if (event.startsWith('settings.'))
    return 'Business settings changed. Review the audit history for the recorded before and after values.';
  return 'Activity was recorded in your business. Use the record reference when reviewing its history or contacting support.';
}
