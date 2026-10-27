import { randomUUID } from 'node:crypto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { listingTransition, onlineOverridesSchema } from '@inventory/contracts';
import type { OnlineCommand, ListingStatus } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { listingEvent, storefrontRevision } from './storefront-events.js';
import { StorefrontConflict } from './storefront-errors.js';
export async function selectListing(
  ctx: OrganizationContext,
  storeId: string,
  item: { productId: string; variantId: string | null },
) {
  const valid = await ctx.tx.query(
    'SELECT 1 FROM catalog_products p WHERE p.business_id=$1 AND p.id=$2 AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM catalog_variants v WHERE v.business_id=p.business_id AND v.product_id=p.id AND v.id=$3))',
    [ctx.business.id, item.productId, item.variantId],
  );
  if (!valid.rowCount) throw new NotFoundException();
  const existing = (
    await ctx.tx.query(
      'SELECT id,state FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND product_id=$3 AND variant_id IS NOT DISTINCT FROM $4::uuid',
      [ctx.business.id, storeId, item.productId, item.variantId],
    )
  ).rows[0];
  if (existing && existing.state !== 'delisted')
    return { id: String(existing.id), ok: false, code: 'ALREADY_LISTED' };
  const id = existing?.id ?? randomUUID();
  if (existing)
    await ctx.tx.query(
      "UPDATE channel_listings SET state='selected',paused_at=NULL,version=version+1 WHERE business_id=$1 AND id=$2",
      [ctx.business.id, id],
    );
  else
    await ctx.tx.query(
      "INSERT INTO channel_listings(id,business_id,store_id,product_id,variant_id,overrides,state) VALUES($1,$2,$3,$4,$5,'{}','selected')",
      [id, ctx.business.id, storeId, item.productId, item.variantId],
    );
  await listingEvent(ctx, storeId, id, existing ? 'removed' : 'unselected', 'selected', 'selected');
  return { id: String(id), ok: true, code: 'SELECTED' };
}
export async function changeListing(
  ctx: OrganizationContext,
  storeId: string,
  item: { id: string; version: number },
  action: 'publish' | 'pause' | 'resume' | 'remove' | 'validate',
  enabled: boolean,
) {
  const row = (
    await ctx.tx.query(
      "SELECT state,version,structured_issues FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND id=$3 AND state<>'delisted'",
      [ctx.business.id, storeId, item.id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  if (row.version !== item.version) throw new StorefrontConflict('LISTING_CHANGED');
  if (action === 'validate')
    return { id: item.id, ok: true, code: row.state, version: row.version as number };
  const ready = !(row.structured_issues as Array<{ severity: string }>).some(
    (i) => i.severity === 'error',
  );
  const next =
    action === 'remove'
      ? 'delisted'
      : listingTransition(row.state as ListingStatus, action, ready, enabled);
  if (!next) throw new StorefrontConflict('LISTING_TRANSITION_INVALID');
  await ctx.tx.query(
    `UPDATE channel_listings SET state=$4,version=version+1,updated_at=now(),
    published_at=CASE WHEN $4='active' THEN now() ELSE published_at END,
    paused_at=CASE WHEN $4='paused' THEN now() WHEN $4='active' THEN NULL ELSE paused_at END WHERE business_id=$1 AND store_id=$2 AND id=$3`,
    [ctx.business.id, storeId, item.id, next],
  );
  await listingEvent(ctx, storeId, item.id, row.state, next, action);
  await storefrontRevision(ctx, storeId);
  return { id: item.id, ok: true, code: next, version: Number(row.version) + 1 };
}
export async function updateOverrides(
  ctx: OrganizationContext,
  storeId: string,
  input: Extract<OnlineCommand, { action: 'overrides' }>,
) {
  const overrides = onlineOverridesSchema.parse(input.overrides);
  if (overrides.images) {
    const product = (
      await ctx.tx.query(
        'SELECT p.images FROM channel_listings l JOIN catalog_products p ON p.business_id=l.business_id AND p.id=l.product_id WHERE l.business_id=$1 AND l.store_id=$2 AND l.id=$3',
        [ctx.business.id, storeId, input.id],
      )
    ).rows[0];
    if (!product) throw new NotFoundException();
    if (overrides.images.some((url) => !product.images.includes(url)))
      throw new BadRequestException('Select images belonging to this product.');
  }
  const result = await ctx.tx.query(
    "UPDATE channel_listings SET overrides='{}',online_overrides=$5,version=version+1,updated_at=now() WHERE business_id=$1 AND store_id=$2 AND id=$3 AND version=$4 AND state<>'delisted' RETURNING state",
    [ctx.business.id, storeId, input.id, input.version, JSON.stringify(overrides)],
  );
  if (!result.rowCount) throw new StorefrontConflict('LISTING_CHANGED');
  await listingEvent(
    ctx,
    storeId,
    input.id,
    result.rows[0]!.state,
    result.rows[0]!.state,
    'overrides_updated',
  );
  await storefrontRevision(ctx, storeId);
}
