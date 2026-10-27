import { randomUUID } from 'node:crypto';
import { hasPermission, notificationPolicy } from '@inventory/contracts';
import type { AccessRole, Permission } from '@inventory/contracts';
import type { Transaction } from '../database/transaction.js';
import { readPolicy } from '../settings/settings-store.js';
const routes: Record<string, Permission> = {
  'storefront.readiness_batch': 'onlineStore.manage',
  'storefront.delisted': 'onlineStore.manage',
  'purchase.created': 'purchases.write',
  'purchase.approve': 'purchases.read',
  'purchase.cancel': 'purchases.read',
  'count.submit': 'business.write',
  'count.approved': 'stock.read',
  'transfer.created': 'stock.write',
  'transfer.approve': 'stock.read',
  'transfer.dispatch': 'stock.read',
  'transfer.receive': 'stock.read',
  'transfer.cancel': 'stock.read',
  'stock.low': 'stock.read',
  'sale.return': 'sales.refund',
  'sale.exchange': 'sales.refund',
  'sale.void': 'sales.void',
  'settings.policy_changed': 'business.write',
};
export async function routeBusinessEvent(
  tx: Transaction,
  businessId: string,
  eventId: string,
  action: string,
  warehouseId: string | null,
  storeId: string | null,
  after: unknown,
) {
  let permission = routes[action];
  if (
    action === 'stock.movement' &&
    after &&
    typeof after === 'object' &&
    'sourceKind' in after &&
    ['manual', 'purchase_return'].includes(String(after.sourceKind))
  )
    permission = after.sourceKind === 'purchase_return' ? 'purchases.read' : 'stock.write';
  if (!permission) return;
  const platform = (await readPolicy(tx)).values,
    business = (await readPolicy(tx, businessId)).values;
  if (!notificationPolicy(platform, business).notifyBusinessAdmins) return;
  if (warehouseId)
    storeId =
      (
        await tx.query<{ store_id: string }>(
          'SELECT store_id FROM warehouses WHERE business_id=$1 AND id=$2',
          [businessId, warehouseId],
        )
      ).rows[0]?.store_id ?? null;
  const members = (
    await tx.query<{
      account_id: string;
      role: AccessRole;
      permissions: Permission[];
      scope_store_id: string | null;
      scope_warehouse_id: string | null;
    }>(
      `SELECT m.account_id,m.role,m.permissions,m.scope_store_id,m.scope_warehouse_id FROM business_memberships m
    JOIN auth_accounts a ON a.id=m.account_id WHERE m.business_id=$1 AND m.state='active' AND a.status='active'`,
      [businessId],
    )
  ).rows;
  for (const member of members) {
    if (
      !hasPermission(member, permission) ||
      (member.scope_store_id && member.scope_store_id !== storeId) ||
      (member.scope_warehouse_id && member.scope_warehouse_id !== warehouseId)
    )
      continue;
    await tx.query(
      `INSERT INTO business_deliveries(id,business_id,event_id,recipient_id,permission,store_id,warehouse_id)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_id,recipient_id) DO NOTHING`,
      [randomUUID(), businessId, eventId, member.account_id, permission, storeId, warehouseId],
    );
  }
}
