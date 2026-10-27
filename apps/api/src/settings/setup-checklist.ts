import type { OrganizationContext } from '../organization/organization.scope.js';
import { requireBusinessScope } from '../catalog/catalog.repository.js';
import { readPolicy } from './settings-store.js';
export async function setupChecklist(ctx: OrganizationContext) {
  requireBusinessScope(ctx);
  const company = (await readPolicy(ctx.tx, ctx.business.id)).values.company;
  const row = (
    await ctx.tx.query<{ locations: boolean; product: boolean; stock: boolean }>(
      `SELECT
    (EXISTS(SELECT 1 FROM stores WHERE business_id=$1 AND state='active') AND
     EXISTS(SELECT 1 FROM warehouses WHERE business_id=$1 AND state='active')) AS locations,
    EXISTS(SELECT 1 FROM catalog_products WHERE business_id=$1 AND state='active') AS product,
    EXISTS(SELECT 1 FROM stock_balances WHERE business_id=$1 AND on_hand>0) AS stock`,
      [ctx.business.id],
    )
  ).rows[0]!;
  return {
    ...row,
    dismissed: !!(
      await ctx.tx.query('SELECT setup_dismissed FROM businesses WHERE id=$1', [ctx.business.id])
    ).rows[0]?.setup_dismissed,
    profile: !!(
      (company?.displayName?.trim() || ctx.business.name.trim()) &&
      company?.address.trim()
    ),
    currency: !!company?.transactionCurrency,
    tax: company?.taxBasisPoints != null,
  };
}
