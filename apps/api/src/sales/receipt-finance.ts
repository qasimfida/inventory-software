import type { OrganizationContext } from '../organization/organization.scope.js';
import { remainingSql } from '../customers/receivable-core.js';
export async function receiptFinance(ctx: OrganizationContext, id: string) {
  const args = [ctx.business.id, id];
  const receivable = (
    await ctx.tx.query<{ outstandingMinor: string; dueDate: string }>(
      `SELECT (${remainingSql})::text AS "outstandingMinor",r.due_date::text AS "dueDate" FROM customer_receivables r WHERE r.business_id=$1 AND r.sale_id=$2`,
      args,
    )
  ).rows[0];
  const returns = (
    await ctx.tx.query(
      `SELECT r.id,r.kind,r.reason_code AS "reasonCode",r.total_minor::text AS "totalMinor",r.credit_minor::text AS "creditMinor",(r.total_minor-r.credit_minor)::text AS "cashRefundMinor",r.created_at::text AS "createdAt",e.replacement_sale_id AS "replacementSaleId" FROM sale_returns r LEFT JOIN sale_exchanges e ON e.business_id=r.business_id AND e.return_id=r.id WHERE r.business_id=$1 AND r.sale_id=$2 ORDER BY r.created_at,r.id`,
      args,
    )
  ).rows;
  const refunds = (
    await ctx.tx.query(
      `SELECT f.id,f.return_id AS "returnId",f.payment_id AS "paymentId",f.amount_minor::text AS "amountMinor" FROM cash_refunds f JOIN sale_returns r ON r.business_id=f.business_id AND r.id=f.return_id WHERE r.business_id=$1 AND r.sale_id=$2 ORDER BY f.created_at,f.id`,
      args,
    )
  ).rows;
  const returnedLines = (
    await ctx.tx.query(
      `SELECT l.sale_line_id AS "saleLineId",sum(l.quantity)::text AS quantity FROM sale_return_lines l JOIN sale_returns r ON r.business_id=l.business_id AND r.id=l.return_id WHERE r.business_id=$1 AND r.sale_id=$2 GROUP BY l.sale_line_id`,
      args,
    )
  ).rows;
  const reconciled =
    (
      await ctx.tx.query<{ ok: boolean }>(
        `SELECT
 s.total_minor=(SELECT COALESCE(sum(l.total_minor),0) FROM sale_lines l WHERE l.business_id=s.business_id AND l.sale_id=s.id)
 AND s.tax_minor=(SELECT COALESCE(sum(l.tax_minor),0) FROM sale_lines l WHERE l.business_id=s.business_id AND l.sale_id=s.id)
 AND s.total_minor-COALESCE((SELECT sum(r.total_minor) FROM sale_returns r WHERE r.business_id=s.business_id AND r.sale_id=s.id),0)
 =COALESCE((SELECT sum(p.amount_minor) FROM cash_payments p WHERE p.business_id=s.business_id AND p.sale_id=s.id),0)
 -COALESCE((SELECT sum(f.amount_minor) FROM cash_refunds f JOIN sale_returns r ON r.business_id=f.business_id AND r.id=f.return_id WHERE r.business_id=s.business_id AND r.sale_id=s.id),0)+$3::numeric AS ok
 FROM sales s WHERE s.business_id=$1 AND s.id=$2`,
        [...args, receivable?.outstandingMinor ?? '0'],
      )
    ).rows[0]?.ok ?? false;
  return {
    reconciled,
    outstandingMinor: receivable?.outstandingMinor ?? '0',
    dueDate: receivable?.dueDate ?? null,
    returns,
    refunds,
    returnedLines,
  };
}
