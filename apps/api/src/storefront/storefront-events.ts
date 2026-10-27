import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
export async function listingEvent(
  ctx: OrganizationContext,
  storeId: string,
  id: string,
  from: string,
  to: string,
  reason: string,
  system = false,
) {
  await ctx.tx.query(
    'INSERT INTO listing_events(business_id,store_id,listing_id,actor_id,transition,reason_code,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      ctx.business.id,
      storeId,
      id,
      system ? null : ctx.actor.accountId,
      `${from}->${to}`,
      reason,
      JSON.stringify({ state: from }),
      JSON.stringify({ state: to }),
    ],
  );
  await audit(
    ctx,
    id,
    'storefront.transition',
    { state: from },
    { state: to, reasonCode: reason, storeId, automated: system },
  );
}
export async function storefrontRevision(ctx: OrganizationContext, storeId: string) {
  const head = await ctx.tx.query<{ revision: string }>(
    'INSERT INTO sync_heads(business_id,revision) VALUES($1,1) ON CONFLICT(business_id) DO UPDATE SET revision=sync_heads.revision+1 RETURNING revision::text',
    [ctx.business.id],
  );
  await ctx.tx.query(
    "INSERT INTO sync_changes(business_id,revision,topic,store_id) VALUES($1,$2,'storefront',$3)",
    [ctx.business.id, head.rows[0]!.revision, storeId],
  );
}
