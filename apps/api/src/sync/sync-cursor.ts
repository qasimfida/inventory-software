import { createHash, randomUUID } from 'node:crypto';
import { canonicalJson } from '@inventory/domain';
import type { OrganizationContext } from '../organization/organization.scope.js';
export const accessHash = (ctx: OrganizationContext) =>
  createHash('sha256')
    .update(
      canonicalJson({
        role: ctx.business.role,
        permissions: ctx.business.permissions,
        scope: ctx.business.scope,
      }),
    )
    .digest('hex');
export async function revision(ctx: OrganizationContext) {
  return (
    (
      await ctx.tx.query<{ revision: string }>(
        'SELECT revision::text FROM sync_heads WHERE business_id=$1',
        [ctx.business.id],
      )
    ).rows[0]?.revision ?? '0'
  );
}
export async function cursor(
  ctx: OrganizationContext,
  warehouseId: string,
  rev: string,
  currency: string,
) {
  const id = randomUUID();
  await ctx.tx.query('DELETE FROM sync_cursors WHERE expires_at<now()');
  await ctx.tx.query(
    "INSERT INTO sync_cursors(id,business_id,actor_id,warehouse_id,access_hash,revision,currency,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '7 days')",
    [id, ctx.business.id, ctx.actor.accountId, warehouseId, accessHash(ctx), rev, currency],
  );
  return id;
}
