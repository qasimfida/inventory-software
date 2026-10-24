import { NotFoundException } from '@nestjs/common';
import { accountingSourceSchema } from '@inventory/contracts';
import type { AccountingSource, JournalLine, SourcePost } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
// All source rows are immutable, business-owned confirmed transactions. Money stays numeric/text.
export const sources = `WITH sources AS (
 SELECT 'sale' AS kind,id,(created_at AT TIME ZONE 'UTC')::date AS date,currency,total_minor AS amount,net_minor AS net,tax_minor AS tax,'payment' AS direction FROM sales WHERE business_id=$1
 UNION ALL SELECT 'sale_return',r.id,(r.created_at AT TIME ZONE 'UTC')::date,s.currency,r.total_minor,r.net_minor,r.tax_minor,'refund' FROM sale_returns r JOIN sales s ON s.business_id=r.business_id AND s.id=r.sale_id WHERE r.business_id=$1
 UNION ALL SELECT 'cash_payment',id,(created_at AT TIME ZONE 'UTC')::date,currency,amount_minor,amount_minor,0,'payment' FROM cash_payments WHERE business_id=$1
 UNION ALL SELECT 'cash_refund',r.id,(r.created_at AT TIME ZONE 'UTC')::date,p.currency,r.amount_minor,r.amount_minor,0,'refund' FROM cash_refunds r JOIN cash_payments p ON p.business_id=r.business_id AND p.id=r.payment_id WHERE r.business_id=$1
 UNION ALL SELECT 'supplier_invoice',i.id,(i.created_at AT TIME ZONE 'UTC')::date,p.currency,i.amount_minor,i.amount_minor,0,'payment' FROM supplier_invoices i JOIN purchase_orders p ON p.business_id=i.business_id AND p.id=i.purchase_id WHERE i.business_id=$1
 UNION ALL SELECT 'supplier_credit',c.id,(c.created_at AT TIME ZONE 'UTC')::date,p.currency,c.amount_minor,c.amount_minor,0,'refund' FROM supplier_credits c JOIN supplier_invoices i ON i.business_id=c.business_id AND i.id=c.invoice_id JOIN purchase_orders p ON p.business_id=i.business_id AND p.id=i.purchase_id WHERE c.business_id=$1
 UNION ALL SELECT 'supplier_settlement',t.id,(t.created_at AT TIME ZONE 'UTC')::date,p.currency,t.amount_minor,t.amount_minor,0,t.kind FROM supplier_settlements t JOIN supplier_invoices i ON i.business_id=t.business_id AND i.id=t.invoice_id JOIN purchase_orders p ON p.business_id=i.business_id AND p.id=i.purchase_id WHERE t.business_id=$1
)`;
export const sourceProjection =
  'kind,id,date::text,currency,amount::text,net::text,tax::text,direction';
export async function loadSource(ctx: OrganizationContext, input: SourcePost) {
  const row = (
    await ctx.tx.query(
      `${sources} SELECT ${sourceProjection} FROM sources WHERE kind=$2 AND id=$3`,
      [ctx.business.id, input.kind, input.sourceId],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return accountingSourceSchema.parse(row);
}
export function sourceLines(s: AccountingSource): JournalLine[] {
  const lines: JournalLine[] = [];
  const line = (account: JournalLine['account'], debit: string, credit: string) => {
    if (BigInt(debit) || BigInt(credit)) lines.push({ account, debit, credit });
  };
  const pair = (debit: JournalLine['account'], credit: JournalLine['account']) => {
    line(debit, s.amount, '0');
    line(credit, '0', s.amount);
  };
  switch (s.kind) {
    case 'sale':
      line('1100', s.amount, '0');
      line('4000', '0', s.net);
      line('2100', '0', s.tax);
      break;
    case 'sale_return':
      line('4100', s.net, '0');
      line('2100', s.tax, '0');
      line('1100', '0', s.amount);
      break;
    case 'cash_payment':
      pair('1000', '1100');
      break;
    case 'cash_refund':
      pair('1100', '1000');
      break;
    case 'supplier_invoice':
      pair('5000', '2000');
      break;
    case 'supplier_credit':
      pair('2000', '5000');
      break;
    case 'supplier_settlement':
      if (s.direction === 'payment') pair('2000', '1000');
      else pair('1000', '2000');
      break;
  }
  return lines;
}
