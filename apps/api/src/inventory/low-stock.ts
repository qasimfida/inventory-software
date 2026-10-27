import { defaultIndustry } from '@inventory/contracts';
import { decimal } from '@inventory/domain';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { readPolicy } from '../settings/settings-store.js';
import type { StockEntry } from './stock-entry.js';
export async function lowStock(ctx: OrganizationContext, input: StockEntry) {
  const policy = (
    await ctx.tx.query<{ reorder_point: string; available: string; location_id: string }>(
      `SELECT p.reorder_point::text,p.location_id,coalesce(s.on_hand-s.reserved-s.damaged,0)::text AS available FROM stock_reorder_policies p LEFT JOIN stock_balances s ON s.business_id=p.business_id AND s.variant_id=p.variant_id AND s.warehouse_id=p.warehouse_id AND s.location_id=p.location_id WHERE p.business_id=$1 AND p.variant_id=$2 AND p.warehouse_id=$3 AND p.location_id=$4 AND p.active`,
      [ctx.business.id, input.variantId, input.warehouseId, input.locationId ?? input.warehouseId],
    )
  ).rows[0];
  if (policy) {
    const available = decimal(policy.available),
      previous =
        available -
        decimal(input.quantityDelta) +
        decimal(input.reservedDelta ?? '0') +
        decimal(input.damagedDelta ?? '0');
    if (available <= decimal(policy.reorder_point) && previous > decimal(policy.reorder_point))
      await audit(ctx, input.variantId, 'stock.low', null, {
        warehouseId: input.warehouseId,
        locationId: policy.location_id,
        variantId: input.variantId,
        quantity: policy.available,
        reorderPoint: policy.reorder_point,
        reasonCode: 'reorder_point',
      });
  }
  const threshold =
    (await readPolicy(ctx.tx, ctx.business.id)).values.industry?.lowStockThreshold ??
    defaultIndustry.lowStockThreshold;
  const row = (
    await ctx.tx.query<{ available: string }>(
      `SELECT COALESCE(sum(on_hand-reserved-damaged),0)::text AS available
    FROM stock_balances WHERE business_id=$1 AND variant_id=$2 AND warehouse_id=$3`,
      [ctx.business.id, input.variantId, input.warehouseId],
    )
  ).rows[0]!;
  const current = decimal(row.available),
    before =
      current -
      decimal(input.quantityDelta) +
      decimal(input.reservedDelta ?? '0') +
      decimal(input.damagedDelta ?? '0');
  if (current <= decimal(threshold) && before > decimal(threshold))
    await audit(ctx, input.variantId, 'stock.low', null, {
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      quantity: row.available,
    });
}
