import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Location, LocationKind } from '@inventory/contracts';
import { locationVisible, requireLocation } from './access.js';
import type { OrganizationContext } from './organization.scope.js';
const projections = {
  stores: `id,name,code,state,version,'stores' AS kind,type,NULL::uuid AS "storeId",NULL::uuid AS "warehouseId"`,
  warehouses: `id,name,code,state,version,'warehouses' AS kind,'warehouse' AS type,store_id AS "storeId",NULL::uuid AS "warehouseId"`,
  terminals: `id,name,code,state,version,'terminals' AS kind,type,store_id AS "storeId",warehouse_id AS "warehouseId"`,
};
export async function listLocations(context: OrganizationContext): Promise<Location[]> {
  const rows: Location[] = [];
  for (const kind of ['stores', 'warehouses', 'terminals'] as const) {
    const result = await context.tx.query<Location>(
      `SELECT ${projections[kind]} FROM ${kind} WHERE business_id=$1 ORDER BY name,id`,
      [context.business.id],
    );
    rows.push(...result.rows.filter((row) => locationVisible(context.business, row)));
  }
  return rows;
}
export async function getLocation(context: OrganizationContext, kind: LocationKind, id: string) {
  const result = await context.tx.query<Location>(
    `SELECT ${projections[kind]} FROM ${kind} WHERE business_id=$1 AND id=$2`,
    [context.business.id, id],
  );
  if (!result.rows[0]) throw new NotFoundException();
  requireLocation(context.business, result.rows[0]);
  return result.rows[0];
}
export async function requireActiveParents(
  context: OrganizationContext,
  storeId: string,
  warehouseId: string | null,
) {
  const store = await getLocation(context, 'stores', storeId);
  if (store.state !== 'active') throw new ConflictException();
  if (warehouseId) {
    const warehouse = await getLocation(context, 'warehouses', warehouseId);
    if (warehouse.state !== 'active' || warehouse.storeId !== storeId)
      throw new ConflictException();
  }
}
export async function checkChildren(
  context: OrganizationContext,
  kind: LocationKind,
  id: string,
  state: string,
) {
  if (kind === 'terminals' || state === 'active') return;
  const condition = state === 'archived' ? "state<>'archived'" : "state='active'";
  const queries =
    kind === 'stores'
      ? [
          `SELECT id FROM warehouses WHERE business_id=$1 AND store_id=$2 AND ${condition}`,
          `SELECT id FROM terminals WHERE business_id=$1 AND store_id=$2 AND ${condition}`,
        ]
      : [`SELECT id FROM terminals WHERE business_id=$1 AND warehouse_id=$2 AND ${condition}`];
  for (const query of queries)
    if ((await context.tx.query(query, [context.business.id, id])).rowCount)
      throw new ConflictException();
}
