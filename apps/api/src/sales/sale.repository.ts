import { receiptFinance } from './receipt-finance.js';
import { NotFoundException } from '@nestjs/common';
import type { Sale } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
export const saleProjection = `id,store_id AS "storeId",warehouse_id AS "warehouseId",customer_id AS "customerId",currency,net_minor::text AS "netMinor",tax_minor::text AS "taxMinor",total_minor::text AS "totalMinor",cash_received_minor::text AS "cashReceivedMinor",change_minor::text AS "changeMinor",state,actor_id AS "actorId",created_at AS "createdAt"`;
export async function getSale(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<Sale & { createdAt: Date }>(
      `SELECT ${saleProjection} FROM sales WHERE business_id=$1 AND id=$2`,
      [ctx.business.id, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export async function saleReceipt(ctx: OrganizationContext, id: string) {
  return {
    sale: await getSale(ctx, id),
    finance: await receiptFinance(ctx, id),
    lines: (
      await ctx.tx.query(
        `SELECT id,variant_id AS "variantId",unit_id AS "unitId",location_id AS "locationId",name,sku,quantity::text,base_quantity::text AS "baseQuantity",unit_price::text AS "unitPrice",price_id AS "priceId",promotion_id AS "promotionId",discount_basis_points AS "discountBasisPoints",manual_discount_basis_points AS "manualDiscountBasisPoints",tax_basis_points AS "taxBasisPoints",tax_inclusive AS "taxInclusive",net_minor::text AS "netMinor",tax_minor::text AS "taxMinor",total_minor::text AS "totalMinor",track_inventory AS "trackInventory",movement_id AS "movementId" FROM sale_lines WHERE business_id=$1 AND sale_id=$2 ORDER BY id`,
        [ctx.business.id, id],
      )
    ).rows,
    payments: (
      await ctx.tx.query(
        `SELECT id,amount_minor::text AS "amountMinor",reference FROM cash_payments WHERE business_id=$1 AND sale_id=$2 ORDER BY created_at,id`,
        [ctx.business.id, id],
      )
    ).rows,
    receivableId:
      (
        await ctx.tx.query<{ id: string }>(
          'SELECT id FROM customer_receivables WHERE business_id=$1 AND sale_id=$2',
          [ctx.business.id, id],
        )
      ).rows[0]?.id ?? null,
  };
}
