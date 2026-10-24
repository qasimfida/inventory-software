import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Transfer } from '@inventory/contracts';
import { audit } from '../organization/organization.scope.js';
import type { OrganizationContext } from '../organization/organization.scope.js';
export const transferProjection = `id,source_warehouse_id AS "sourceWarehouseId",source_location_id AS "sourceLocationId",destination_warehouse_id AS "destinationWarehouseId",destination_location_id AS "destinationLocationId",reference,state,version,created_at AS "createdAt"`;
export async function getTransfer(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<Transfer & { createdAt: Date }>(
      `SELECT ${transferProjection} FROM stock_transfers WHERE business_id=$1 AND id=$2`,
      [ctx.business.id, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export async function transferLines(ctx: OrganizationContext, id: string) {
  return (
    await ctx.tx.query<{
      id: string;
      variantId: string;
      unitId: string;
      quantity: string;
      baseQuantity: string;
      settled: string;
      reservationId: string | null;
    }>(
      `SELECT id,variant_id AS "variantId",unit_id AS "unitId",quantity::text,base_quantity::text AS "baseQuantity",settled::text,reservation_id AS "reservationId" FROM transfer_lines WHERE business_id=$1 AND transfer_id=$2 ORDER BY id`,
      [ctx.business.id, id],
    )
  ).rows;
}
export async function transferDetail(ctx: OrganizationContext, id: string) {
  return {
    transfer: await getTransfer(ctx, id),
    lines: await transferLines(ctx, id),
    events: (
      await ctx.tx.query<{
        id: string;
        action: string;
        actorId: string;
        reason: string;
        createdAt: Date;
      }>(
        `SELECT id,action,actor_id AS "actorId",reason,created_at AS "createdAt" FROM transfer_events WHERE business_id=$1 AND transfer_id=$2 ORDER BY created_at,id`,
        [ctx.business.id, id],
      )
    ).rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    receipts: (
      await ctx.tx.query(
        `SELECT r.id,r.line_id AS "lineId",r.received::text,r.damaged::text,r.shortage::text,r.reason,r.actor_id AS "actorId" FROM transfer_receipts r JOIN transfer_lines l ON l.business_id=r.business_id AND l.id=r.line_id WHERE l.business_id=$1 AND l.transfer_id=$2 ORDER BY r.created_at,r.id`,
        [ctx.business.id, id],
      )
    ).rows,
  };
}
export async function transferEvent(
  ctx: OrganizationContext,
  transfer: Transfer,
  action: string,
  reason: string,
) {
  await ctx.tx.query(
    'INSERT INTO transfer_events(id,business_id,transfer_id,action,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(), ctx.business.id, transfer.id, action, ctx.actor.accountId, reason],
  );
  for (const warehouseId of new Set([
    transfer.sourceWarehouseId,
    transfer.destinationWarehouseId,
  ])) {
    const wh = (
      await ctx.tx.query<{ store_id: string }>(
        'SELECT store_id FROM warehouses WHERE business_id=$1 AND id=$2',
        [ctx.business.id, warehouseId],
      )
    ).rows[0]!;
    await audit(ctx, transfer.id, `transfer.${action}`, null, {
      transferId: transfer.id,
      warehouseId,
      storeId: wh.store_id,
      state: transfer.state,
      ...(action === 'approve' ? { approvalReason: reason } : {}),
    });
  }
}
