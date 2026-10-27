import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import type { OnlineCommand } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import type { StorefrontProjection } from './storefront-projection.js';
import {
  managementSettings,
  managementPrerequisites,
  legacySettings,
} from './storefront-management-records.js';
import { saveManagementSettings } from './storefront-management-settings.js';
import { changeListing, selectListing, updateOverrides } from './storefront-management-listings.js';
import { settings } from './storefront-records.js';
import { StorefrontConflict } from './storefront-errors.js';
export async function executeManagement(
  ctx: OrganizationContext,
  s: string,
  input: OnlineCommand,
  projection: StorefrontProjection,
  origins: readonly string[],
) {
  let config = await managementSettings(ctx, s, origins);
  if (input.action === 'settings') {
    await saveManagementSettings(ctx, s, input.settings);
    await projection.refresh(ctx, legacySettings(input.settings), undefined, false);
    return { ok: true, items: [] };
  }
  if (!config) throw new BadRequestException('Configure the store first.');
  if (
    input.action === 'enable' ||
    input.action === 'disable' ||
    input.action === 'add-host' ||
    input.action === 'remove-host'
  ) {
    if (config.version !== input.version) throw new StorefrontConflict('STOREFRONT_CHANGED');
    if (input.action === 'enable' || input.action === 'disable')
      config = { ...config, enabled: input.action === 'enable' };
    else if ('host' in input)
      config = {
        ...config,
        allowedImageHosts:
          input.action === 'add-host'
            ? [...new Set([...config.allowedImageHosts, input.host])]
            : config.allowedImageHosts.filter((h) => h !== input.host),
      };
    await saveManagementSettings(ctx, s, config, input.action === 'remove-host');
    await projection.refresh(
      ctx,
      legacySettings(config),
      undefined,
      true,
      input.action === 'remove-host' ? 'image_host_removed' : 'settings_changed',
    );
    return { ok: true, items: [] };
  }
  if (input.action === 'overrides') {
    await updateOverrides(ctx, s, input);
    await projection.refresh(ctx, legacySettings(config), undefined, false);
    return { ok: true, items: [{ id: input.id, ok: true, code: 'UPDATED' }] };
  }
  if (input.action === 'select') {
    const items = [];
    for (const item of input.items)
      items.push(await commandItem(ctx, item.productId, () => selectListing(ctx, s, item)));
    await projection.refresh(
      ctx,
      legacySettings(config),
      input.items.map((i) => i.productId),
      false,
    );
    for (const item of items) {
      if (!item.ok) continue;
      const state = (
        await ctx.tx.query(
          'SELECT state FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND id=$3',
          [ctx.business.id, s, item.id],
        )
      ).rows[0]?.state;
      if (state) item.code = String(state);
    }
    return { ok: items.every((i) => i.ok), items };
  }
  if (!('items' in input) || !('all' in input)) throw new BadRequestException();
  if (input.all && input.action !== 'validate')
    throw new BadRequestException('Explicit versions are required for bulk actions.');
  // Revalidation is committed even when publication fails for individual items.
  const legacy = await settings(ctx, s);
  if (!legacy) throw new NotFoundException();
  await projection.refresh(ctx, legacy, undefined, false);
  const enabled = config.enabled && !(await managementPrerequisites(ctx, config)).length;
  const items = [];
  for (const item of input.items)
    items.push(
      await commandItem(ctx, item.id, () => changeListing(ctx, s, item, input.action, enabled)),
    );
  return { ok: items.every((i) => i.ok), items };
}
async function commandItem(
  ctx: OrganizationContext,
  id: string,
  work: () => Promise<{ id: string; ok: boolean; code: string; version?: number }>,
) {
  await ctx.tx.query('SAVEPOINT storefront_item');
  try {
    const result = await work();
    await ctx.tx.query('RELEASE SAVEPOINT storefront_item');
    return result;
  } catch (error) {
    await ctx.tx.query('ROLLBACK TO SAVEPOINT storefront_item');
    await ctx.tx.query('RELEASE SAVEPOINT storefront_item');
    if (!(error instanceof HttpException) || error.getStatus() >= 500) throw error;
    return {
      id,
      ok: false,
      code:
        error instanceof StorefrontConflict
          ? error.publicCode
          : error.getStatus() === 404
            ? 'NOT_FOUND'
            : 'INVALID_REQUEST',
    };
  }
}
