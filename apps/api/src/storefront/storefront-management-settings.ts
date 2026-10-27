import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { OnlineStoreSettings } from '@inventory/contracts';
import { onlineStoreSettingsSchema } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { managementPrerequisites, legacySettings } from './storefront-management-records.js';
import { StorefrontConflict } from './storefront-errors.js';
import { storefrontRevision } from './storefront-events.js';
export async function saveManagementSettings(
  ctx: OrganizationContext,
  storeId: string,
  input: OnlineStoreSettings,
  permitHostRemoval = false,
) {
  if (input.businessId !== ctx.business.id || input.storeId !== storeId)
    throw new NotFoundException();
  const current = (
    await ctx.tx.query(
      'SELECT version,management FROM storefront_settings WHERE business_id=$1 AND store_id=$2',
      [ctx.business.id, storeId],
    )
  ).rows[0];
  if ((current?.version ?? 0) !== input.version) throw new StorefrontConflict('STOREFRONT_CHANGED');
  const sources = [...new Set(input.stockSources)];
  const valid = await ctx.tx.query(
    "SELECT id FROM warehouses WHERE business_id=$1 AND store_id=$2 AND state='active' AND id=ANY($3::uuid[])",
    [ctx.business.id, storeId, sources],
  );
  if (valid.rowCount !== sources.length)
    throw new BadRequestException('Stock sources must belong to this store.');
  if (
    input.fulfillment.pickup.locationId &&
    input.fulfillment.pickup.locationId !== storeId &&
    !sources.includes(input.fulfillment.pickup.locationId)
  )
    throw new BadRequestException('Pickup must use this store or a linked stock source.');
  const s = onlineStoreSettingsSchema.parse({
    ...input,
    status: input.enabled
      ? 'live'
      : current?.management?.status === 'live' ||
          current?.management?.status === 'disabled' ||
          input.status === 'disabled'
        ? 'disabled'
        : 'configured',
    stockSources: sources,
  });
  if (s.enabled && !permitHostRemoval && (await managementPrerequisites(ctx, s)).length)
    throw new StorefrontConflict('STOREFRONT_SETUP_INCOMPLETE');
  await ctx.tx.query(
    `INSERT INTO storefront_settings(business_id,store_id,slug,settings,management,actor_id) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(business_id,store_id) DO UPDATE SET slug=excluded.slug,settings=excluded.settings,management=excluded.management,actor_id=excluded.actor_id,version=storefront_settings.version+1,dirty=true,next_check=now()`,
    [
      ctx.business.id,
      storeId,
      s.slug,
      JSON.stringify(legacySettings(s)),
      JSON.stringify(s),
      ctx.actor.accountId,
    ],
  );
  await audit(ctx, storeId, 'storefront.settings', null, {
    storeId,
    version: input.version + 1,
    state: s.status,
  });
  await storefrontRevision(ctx, storeId);
}
