import { defaultIndustry } from '@inventory/contracts';
import { decimal } from '@inventory/domain';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { readPolicy } from '../settings/settings-store.js';
import type { StockEntry } from './stock-entry.js';
export async function lowStock(ctx: OrganizationContext, input: StockEntry) {
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
