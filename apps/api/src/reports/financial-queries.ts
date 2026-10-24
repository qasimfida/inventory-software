// SQL fragments are static application constants. Values are always bound parameters.
const scopedSale = 'JOIN wh ON wh.id=s.warehouse_id AND wh.business_id=s.business_id';
const scopedOrder =
  'JOIN purchase_orders p ON p.business_id=i.business_id AND p.id=i.purchase_id JOIN wh ON wh.id=p.warehouse_id AND wh.business_id=p.business_id';
const period = (alias: string) =>
  `${alias}.created_at >= (SELECT start FROM bounds) AND ${alias}.created_at < (SELECT finish FROM bounds)`;
const metric = (key: string, label: string, value: string, currency: string) =>
  `'${key}:'||${currency} AS key,'${label}' AS label,(${value})::text AS value,${currency}||' minor units' AS unit`;
export const salesReport = `
 SELECT ${metric('sales', 'Gross sales including tax', 'sum(s.total_minor)', 's.currency')} FROM sales s ${scopedSale} WHERE ${period('s')} GROUP BY s.currency
 UNION ALL SELECT ${metric('returns', 'Returns / voids including tax', 'sum(r.total_minor)', 's.currency')} FROM sale_returns r JOIN sales s ON s.business_id=r.business_id AND s.id=r.sale_id ${scopedSale} WHERE ${period('r')} GROUP BY s.currency
 UNION ALL SELECT ${metric('net', 'Net revenue excluding tax after returns', 'sum(amount)', 'currency')} FROM (
 SELECT s.currency,s.net_minor AS amount FROM sales s ${scopedSale} WHERE ${period('s')}
 UNION ALL SELECT s.currency,-r.net_minor FROM sale_returns r JOIN sales s ON s.business_id=r.business_id AND s.id=r.sale_id ${scopedSale} WHERE ${period('r')}) x GROUP BY currency
 UNION ALL SELECT 'transactions' AS key,'Completed sale transactions' AS label,count(*)::text AS value,'transactions' AS unit FROM sales s ${scopedSale} WHERE ${period('s')}`;
export const purchasesReport = `
 SELECT ${metric('invoiced', 'Supplier invoices posted', 'sum(i.amount_minor)', 'p.currency')} FROM supplier_invoices i ${scopedOrder} WHERE ${period('i')} GROUP BY p.currency
 UNION ALL SELECT ${metric('credits', 'Supplier return credits posted', 'sum(c.amount_minor)', 'p.currency')} FROM supplier_credits c JOIN supplier_invoices i ON i.business_id=c.business_id AND i.id=c.invoice_id ${scopedOrder} WHERE ${period('c')} GROUP BY p.currency
 UNION ALL SELECT 'orders:'||p.state AS key,'Purchase orders: '||p.state AS label,count(*)::text AS value,'orders' AS unit FROM purchase_orders p JOIN wh ON wh.business_id=p.business_id AND wh.id=p.warehouse_id WHERE ${period('p')} GROUP BY p.state
 UNION ALL SELECT 'receipts' AS key,'Receipt lines posted' AS label,count(*)::text AS value,'receipt lines' AS unit FROM purchase_receipts r JOIN purchase_lines l ON l.business_id=r.business_id AND l.id=r.line_id JOIN purchase_orders p ON p.business_id=l.business_id AND p.id=l.purchase_id JOIN wh ON wh.business_id=p.business_id AND wh.id=p.warehouse_id WHERE ${period('r')}`;
export const paymentsReport = `
 SELECT ${metric('cash-in', 'Customer cash received', 'sum(p.amount_minor)', 'p.currency')} FROM cash_payments p JOIN wh ON wh.business_id=p.business_id AND wh.id=p.warehouse_id WHERE ${period('p')} GROUP BY p.currency
 UNION ALL SELECT ${metric('cash-refunds', 'Customer cash refunded', 'sum(r.amount_minor)', 'p.currency')} FROM cash_refunds r JOIN cash_payments p ON p.business_id=r.business_id AND p.id=r.payment_id JOIN wh ON wh.business_id=p.business_id AND wh.id=p.warehouse_id WHERE ${period('r')} GROUP BY p.currency`;
export const supplierPaymentsReport = `
 UNION ALL SELECT ${metric("supplier-'||t.kind||'", "Supplier cash '||t.kind||'", 'sum(t.amount_minor)', 'p.currency')} FROM supplier_settlements t JOIN supplier_invoices i ON i.business_id=t.business_id AND i.id=t.invoice_id ${scopedOrder} WHERE ${period('t')} GROUP BY p.currency,t.kind`;
export const receivablesReport = `
 SELECT ${metric('receivable', 'Current customer outstanding', 'sum(r.amount_minor-COALESCE(a.amount,0)-COALESCE(c.amount,0))', 'r.currency')}
 FROM customer_receivables r JOIN wh ON wh.business_id=r.business_id AND wh.id=r.warehouse_id
 LEFT JOIN LATERAL (SELECT sum(amount_minor) amount FROM receivable_allocations WHERE business_id=r.business_id AND receivable_id=r.id) a ON true
 LEFT JOIN LATERAL (SELECT sum(amount_minor) amount FROM receivable_credits WHERE business_id=r.business_id AND receivable_id=r.id) c ON true GROUP BY r.currency`;
export const payablesReport = `
 SELECT ${metric('payable', 'Current supplier outstanding (negative = supplier owes business)', 'sum(i.amount_minor-COALESCE(c.amount,0)-COALESCE(t.amount,0))', 'p.currency')}
 FROM supplier_invoices i ${scopedOrder}
 LEFT JOIN LATERAL (SELECT sum(amount_minor) amount FROM supplier_credits WHERE business_id=i.business_id AND invoice_id=i.id) c ON true
 LEFT JOIN LATERAL (SELECT sum(CASE WHEN kind='payment' THEN amount_minor ELSE -amount_minor END) amount FROM supplier_settlements WHERE business_id=i.business_id AND invoice_id=i.id) t ON true GROUP BY p.currency`;
