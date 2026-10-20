import { NotFoundException } from '@nestjs/common';
import type { Purchase } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
export const orderProjection = `id,supplier_id AS "supplierId",warehouse_id AS "warehouseId",currency,reference,state,version,created_at AS "createdAt"`;
export async function purchase(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<Purchase & { createdAt: Date }>(
      `SELECT ${orderProjection} FROM purchase_orders WHERE business_id=$1 AND id=$2`,
      [ctx.business.id, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export async function detail(ctx: OrganizationContext, id: string) {
  const b = ctx.business.id;
  return {
    order: await purchase(ctx, id),
    lines: (
      await ctx.tx.query(
        `SELECT id,variant_id AS "variantId",unit_id AS "unitId",quantity::text,unit_cost::text AS "unitCost",base_quantity::text AS "baseQuantity",received::text FROM purchase_lines WHERE business_id=$1 AND purchase_id=$2 ORDER BY id`,
        [b, id],
      )
    ).rows,
    receipts: (
      await ctx.tx.query(
        `SELECT r.id,r.line_id AS "lineId",r.quantity::text,r.damaged::text,r.damage_reason AS "damageReason",r.actor_id AS "actorId",r.created_at::text AS "createdAt",r.location_id AS "locationId",r.movement_id AS "movementId",COALESCE((SELECT sum(t.quantity) FROM purchase_returns t WHERE t.business_id=r.business_id AND t.receipt_id=r.id),0)::text AS returned FROM purchase_receipts r JOIN purchase_lines l ON l.business_id=r.business_id AND l.id=r.line_id WHERE l.business_id=$1 AND l.purchase_id=$2 ORDER BY r.created_at,r.id`,
        [b, id],
      )
    ).rows,
    returns: (
      await ctx.tx.query(
        `SELECT t.id,t.receipt_id AS "receiptId",t.quantity::text,t.movement_id AS "movementId",t.credit_reference AS "creditReference",t.reason FROM purchase_returns t JOIN purchase_receipts r ON r.business_id=t.business_id AND r.id=t.receipt_id JOIN purchase_lines l ON l.business_id=r.business_id AND l.id=r.line_id WHERE l.business_id=$1 AND l.purchase_id=$2 ORDER BY t.created_at,t.id`,
        [b, id],
      )
    ).rows,
    invoices: (
      await ctx.tx.query(
        `SELECT id,reference,amount_minor::text AS "amountMinor",due_date::text AS "dueDate" FROM supplier_invoices WHERE business_id=$1 AND purchase_id=$2 ORDER BY created_at,id`,
        [b, id],
      )
    ).rows,
  };
}
export async function line(ctx: OrganizationContext, orderId: string, id: string) {
  const row = (
    await ctx.tx.query<{
      id: string;
      variantId: string;
      unitId: string;
      quantity: string;
      baseQuantity: string;
      received: string;
      unitCost: string;
    }>(
      `SELECT id,variant_id AS "variantId",unit_id AS "unitId",quantity::text,base_quantity::text AS "baseQuantity",received::text,unit_cost::text AS "unitCost" FROM purchase_lines WHERE business_id=$1 AND purchase_id=$2 AND id=$3`,
      [ctx.business.id, orderId, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return row;
}
