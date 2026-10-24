import { NotFoundException } from '@nestjs/common';
import type { Payable } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';

export const payableRows = `WITH amounts AS (
 SELECT i.id,i.purchase_id AS "purchaseId",o.supplier_id AS "supplierId",s.name AS "supplierName",
 o.warehouse_id AS "warehouseId",o.currency,i.reference,i.due_date::text AS "dueDate",i.amount_minor AS gross,
 COALESCE((SELECT sum(c.amount_minor) FROM supplier_credits c WHERE c.business_id=i.business_id AND c.invoice_id=i.id),0) AS credits,
 COALESCE((SELECT sum(p.amount_minor) FROM supplier_settlements p WHERE p.business_id=i.business_id AND p.invoice_id=i.id AND p.kind='payment'),0) AS paid,
 COALESCE((SELECT sum(p.amount_minor) FROM supplier_settlements p WHERE p.business_id=i.business_id AND p.invoice_id=i.id AND p.kind='refund'),0) AS refunded
 FROM supplier_invoices i JOIN purchase_orders o ON o.business_id=i.business_id AND o.id=i.purchase_id
 JOIN suppliers s ON s.business_id=o.business_id AND s.id=o.supplier_id WHERE i.business_id=$1
), invoices AS (SELECT *,gross::text AS "amountMinor",credits::text AS "creditMinor",paid::text AS "paidMinor",
 refunded::text AS "refundedMinor",(gross-credits-paid+refunded)::text AS "outstandingMinor" FROM amounts)`;
const projection = `id,"purchaseId","supplierId","supplierName","warehouseId",currency,reference,"dueDate","amountMinor","creditMinor","paidMinor","refundedMinor","outstandingMinor"`;
export const payableProjection = projection;
export async function payable(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<Payable>(`${payableRows} SELECT ${projection} FROM invoices WHERE id=$2`, [
      ctx.business.id,
      id,
    ])
  ).rows[0];
  if (!row) throw new NotFoundException();
  return row;
}
export async function payableDetail(ctx: OrganizationContext, invoice: Payable, offset = 0) {
  const events = (
    await ctx.tx.query(
      `SELECT * FROM (
      SELECT id,'credit'::text AS kind,amount_minor::text AS "amountMinor",reference,reason,actor_id AS "actorId",created_at AS "createdAt",return_id AS "returnId",NULL::uuid AS "shiftId"
      FROM supplier_credits WHERE business_id=$1 AND invoice_id=$2 UNION ALL
      SELECT id,kind,amount_minor::text,reference,''::text,actor_id,created_at,NULL::uuid,shift_id
      FROM supplier_settlements WHERE business_id=$1 AND invoice_id=$2
    ) e ORDER BY "createdAt" DESC,id DESC LIMIT 26 OFFSET $3`,
      [ctx.business.id, invoice.id, offset],
    )
  ).rows;
  const returns = (
    await ctx.tx.query(
      `SELECT r.id,r.quantity::text,r.credit_reference AS "creditReference" FROM purchase_returns r
     JOIN purchase_receipts p ON p.business_id=r.business_id AND p.id=r.receipt_id
     JOIN purchase_lines l ON l.business_id=p.business_id AND l.id=p.line_id
     WHERE r.business_id=$1 AND l.purchase_id=$2 AND NOT EXISTS(
       SELECT 1 FROM supplier_credits c WHERE c.business_id=r.business_id AND c.return_id=r.id)
     ORDER BY r.created_at DESC,r.id DESC LIMIT 100`,
      [ctx.business.id, invoice.purchaseId],
    )
  ).rows;
  return { invoice, events: events.slice(0, 25), returns, offset, hasMore: events.length > 25 };
}
