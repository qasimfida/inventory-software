import { hasPermission } from '@inventory/contracts';
import type { Permission } from '@inventory/contracts';
import type { DemoSeed } from './seed.js';
import { demoDate } from './identity.js';
import { demoSession } from './account.js';
export function readAdministration(s: DemoSeed, path: string, empty: boolean): unknown {
  if (path === 'audit') return empty ? { events: [], nextCursor: null } : s.audit;
  if (path === 'settings')
    return {
      version: 0,
      values: { defaults: {}, enforced: {}, notifications: {}, industry: s.industry },
    };
  if (path === 'notifications') {
    const access: Record<string, Permission> = {
      'purchase.created': 'purchases.write',
      'stock.low': 'stock.read',
      'count.submit': 'business.write',
      'transfer.dispatch': 'stock.read',
      'settings.policy_changed': 'business.write',
    };
    return {
      ...s.inbox,
      notifications: empty
        ? []
        : s.inbox.notifications.filter(
            (n) => access[n.event] && hasPermission(s.business, access[n.event]!),
          ),
    };
  }
  if (path === 'notifications/approvals')
    return {
      ...s.approvals,
      items: empty
        ? []
        : s.approvals.items.filter((item) =>
            hasPermission(
              s.business,
              item.kind === 'purchase' ? 'purchases.write' : 'business.write',
            ),
          ),
    };
  if (path === 'notifications/failures') return { deliveries: [] };
  if (path === 'accounting')
    return empty
      ? { periods: [], journals: [], pending: [], balances: [], offset: 0, hasMore: false }
      : s.accounting;
  if (path === 'trading')
    return empty
      ? {
          relationships: [],
          orders: [],
          hasMoreRelationships: false,
          hasMoreOrders: false,
          offset: 0,
        }
      : s.trading;
  if (path.endsWith('/history'))
    return {
      events: [
        {
          id: '1',
          businessId: s.business.id,
          state: 'accepted',
          note: 'Demonstration partner accepted the order.',
          createdAt: demoDate(3),
        },
      ],
      hasMore: false,
    };
  if (path === 'integrations') return s.integrations;
  if (path === 'sync/events') return { revision: '1', clockVersion: 1 };
  if (path === 'sync/identity') return { actorId: demoSession().user.id };
  if (path === 'sync/policy') return { enabled: false, leaseMinutes: 60, version: 1 };
  return undefined;
}
