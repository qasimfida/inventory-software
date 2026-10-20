import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { hasPermission, locationInScope } from '@inventory/contracts';
import type { Business, Location, Permission } from '@inventory/contracts';
export const businessAccessProjection = `b.id,b.name,b.state,b.version,b.time_zone AS "timeZone",
 CASE WHEN p.account_id IS NOT NULL THEN 'super_admin' ELSE m.role::text END AS role,
 CASE WHEN p.account_id IS NOT NULL THEN '{}'::text[] ELSE m.permissions END AS permissions,
 json_build_object('storeId',CASE WHEN p.account_id IS NULL THEN m.scope_store_id END,
 'warehouseId',CASE WHEN p.account_id IS NULL THEN m.scope_warehouse_id END) AS scope`;
export const businessAccessJoin = `JOIN auth_accounts a ON a.id=$2 AND a.status='active'
 LEFT JOIN platform_administrators p ON p.account_id=a.id
 LEFT JOIN business_memberships m ON m.business_id=b.id AND m.account_id=a.id AND m.state='active'`;
export function requirePermission(business: Business, permission: Permission) {
  if (!hasPermission(business, permission)) throw new ForbiddenException();
}
export const locationVisible = locationInScope;
export function requireLocation(business: Business, location: Location, writing = false) {
  if (!locationVisible(business, location, writing)) throw new NotFoundException();
}
