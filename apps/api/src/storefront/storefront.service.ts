import { StorefrontConflict } from './storefront-errors.js';
import { idempotent } from '../database/idempotency.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { managementSettings, legacySettings } from './storefront-management-records.js';
import { saveManagementSettings } from './storefront-management-settings.js';
import { listingEvent, storefrontRevision } from './storefront-events.js';
import {
  Inject,
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hasPermission } from '@inventory/contracts';
import type { StorefrontSettings, ListingInput } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { StorefrontProjection } from './storefront-projection.js';
import { settings, listings, prerequisites, storefrontDefaults } from './storefront-records.js';
@Injectable()
export class StorefrontService {
  constructor(
    @Inject(RateLimitService) private limits: RateLimitService,
    @Inject(OrganizationScope) private scope: OrganizationScope,
    @Inject(StorefrontProjection) private projection: StorefrontProjection,
    @Inject(ENVIRONMENT) private env: Environment,
  ) {}
  async run<T>(actor: Actor, b: string, work: (ctx: OrganizationContext) => Promise<T>) {
    await this.limits.consume(`storefront:${actor.accountId}:${b}:write`, 120);
    return this.scope.run(actor, b, 'onlineStore.manage', async (ctx) => {
      if (ctx.business.scope?.storeId) throw new ForbiddenException();
      return work(ctx);
    });
  }
  async read(actor: Actor, b: string) {
    await this.limits.consume(`storefront:${actor.accountId}:${b}:read`, 900);
    return this.scope.run(actor, b, 'business.read', async (ctx) => {
      if (!hasPermission(ctx.business, 'onlineStore.view')) throw new ForbiddenException();
      if (ctx.business.scope?.warehouseId) throw new ForbiddenException();
      const config = await settings(ctx);
      if (config) await this.projection.refresh(ctx, config);
      return {
        settings: config,
        defaults: await storefrontDefaults(ctx),
        prerequisites: config ? await prerequisites(ctx, config) : ['Configure the online store'],
        listings: await listings(ctx, config?.storeId),
        trustedMediaOrigins: this.env.storefrontMediaOrigins,
      };
    });
  }
  write<T>(
    actor: Actor,
    b: string,
    operation: string,
    input: { idempotencyKey?: string | undefined },
    work: (ctx: OrganizationContext) => Promise<T>,
  ) {
    return this.run(actor, b, (ctx) =>
      input.idempotencyKey
        ? idempotent(ctx, operation, input.idempotencyKey, input, () => work(ctx))
        : work(ctx),
    );
  }
  save(actor: Actor, b: string, input: StorefrontSettings) {
    return this.write(actor, b, 'storefront.legacy.settings', input, async (ctx) => {
      const before = await settings(ctx, input.storeId);
      const stored = (
        await ctx.tx.query(
          'SELECT management FROM storefront_settings WHERE business_id=$1 AND store_id=$2',
          [b, input.storeId],
        )
      ).rows[0];
      if (stored?.management) {
        const managed = (await managementSettings(
          ctx,
          input.storeId,
          this.env.storefrontMediaOrigins,
        ))!;
        const merged = {
          ...managed,
          name: input.name,
          slug: input.slug,
          currency: input.currency,
          enabled: input.enabled,
          version: input.version,
          contact:
            input.contact === legacySettings(managed).contact
              ? managed.contact
              : { ...managed.contact, address: input.contact },
          fulfillment: {
            ...managed.fulfillment,
            pickup: { ...managed.fulfillment.pickup, enabled: input.fulfillment !== 'delivery' },
            cashOnDelivery: input.fulfillment !== 'pickup',
          },
          returnPolicy: input.returnPolicy,
          shippingPolicy: input.shippingPolicy,
          soldOutBehavior: input.hideSoldOut ? ('hide' as const) : ('show' as const),
        };
        await saveManagementSettings(ctx, input.storeId, merged);
        await this.projection.refresh(ctx, legacySettings(merged));
        return { ok: true };
      }
      if ((before?.version ?? 0) !== input.version)
        throw new StorefrontConflict('STOREFRONT_CHANGED');
      if (input.enabled && (await prerequisites(ctx, input)).length)
        throw new BadRequestException('Complete the storefront prerequisites before enabling.');
      if (
        !(
          await ctx.tx.query('SELECT 1 FROM stores WHERE business_id=$1 AND id=$2', [
            b,
            input.storeId,
          ])
        ).rowCount
      )
        throw new NotFoundException();
      await ctx.tx.query(
        'INSERT INTO storefront_settings(business_id,slug,store_id,settings,actor_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(business_id,store_id) DO UPDATE SET slug=excluded.slug,store_id=excluded.store_id,settings=excluded.settings,actor_id=excluded.actor_id,version=storefront_settings.version+1,dirty=true',
        [
          b,
          input.slug,
          input.storeId,
          JSON.stringify({ ...input, idempotencyKey: undefined }),
          actor.accountId,
        ],
      );
      await this.projection.refresh(ctx, input);
      await audit(ctx, b, 'storefront.settings', before, {
        enabled: input.enabled,
        version: input.version + 1,
      });
      return { ok: true };
    });
  }
  select(actor: Actor, b: string, input: ListingInput) {
    return this.write(actor, b, 'storefront.legacy.selection', input, async (ctx) => {
      const config = await settings(ctx);
      if (!config) throw new BadRequestException('Configure the online store first.');
      if (
        !(
          await ctx.tx.query('SELECT 1 FROM catalog_products WHERE business_id=$1 AND id=$2', [
            b,
            input.productId,
          ])
        ).rowCount
      )
        throw new NotFoundException();
      const before = (
        await ctx.tx.query(
          'SELECT id,version,state FROM channel_listings WHERE business_id=$1 AND product_id=$2 AND store_id=$3 AND variant_id IS NULL',
          [b, input.productId, config.storeId],
        )
      ).rows[0];
      if ((before?.version ?? 0) !== input.version) throw new StorefrontConflict('LISTING_CHANGED');
      if (
        !before &&
        Number(
          (await ctx.tx.query('SELECT count(*) FROM channel_listings WHERE business_id=$1', [b]))
            .rows[0]?.count,
        ) >= 100
      )
        throw new BadRequestException('At most 100 selected products are supported.');
      const id = before?.id ?? randomUUID();
      await ctx.tx.query(
        "INSERT INTO channel_listings(id,business_id,product_id,overrides,store_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(store_id,product_id,(COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid))) DO UPDATE SET overrides=excluded.overrides,state=CASE WHEN channel_listings.state='delisted' THEN 'needs_changes' ELSE channel_listings.state END,version=channel_listings.version+1",
        [
          id,
          b,
          input.productId,
          JSON.stringify({ ...input, idempotencyKey: undefined }),
          config.storeId,
        ],
      );
      if (!before || before.state === 'delisted')
        await listingEvent(
          ctx,
          config.storeId,
          id,
          before ? 'removed' : 'unselected',
          'needs_changes',
          'selected',
        );
      await this.projection.refresh(ctx, config);
      await audit(ctx, id, 'storefront.listing_updated', null, { productId: input.productId });
      return { id };
    });
  }
  command(
    actor: Actor,
    b: string,
    id: string,
    input: {
      version: number;
      action: 'publish' | 'pause' | 'remove';
      idempotencyKey?: string | undefined;
    },
  ) {
    return this.write(actor, b, `storefront.legacy.command:${id}`, input, async (ctx) => {
      const config = await settings(ctx);
      if (!config) throw new NotFoundException();
      await this.projection.refresh(ctx, config);
      const row = (
        await ctx.tx.query(
          'SELECT state,version,issues FROM channel_listings WHERE business_id=$1 AND id=$2 AND store_id=$3',
          [b, id, config.storeId],
        )
      ).rows[0];
      if (!row) throw new NotFoundException();
      if (row.version !== input.version) throw new StorefrontConflict('LISTING_CHANGED');
      if (
        input.action === 'publish' &&
        (!config.enabled ||
          (await prerequisites(ctx, config)).length ||
          row.issues.length ||
          !['ready', 'paused'].includes(row.state))
      )
        throw new StorefrontConflict('LISTING_TRANSITION_INVALID');
      if (input.action === 'pause' && row.state !== 'active')
        throw new StorefrontConflict('LISTING_TRANSITION_INVALID');
      const state =
        input.action === 'publish' ? 'active' : input.action === 'pause' ? 'paused' : 'delisted';
      await ctx.tx.query(
        "UPDATE channel_listings SET state=$3,paused_at=CASE WHEN $3='paused' THEN now() WHEN $3='active' THEN NULL ELSE paused_at END,published_at=CASE WHEN $3='active' THEN now() ELSE published_at END,version=version+1 WHERE business_id=$1 AND id=$2",
        [b, id, state],
      );
      await listingEvent(ctx, config.storeId, id, row.state, state, input.action);
      await storefrontRevision(ctx, config.storeId);
      await audit(ctx, id, `storefront.${input.action}`, { state: row.state }, { state });
      return { ok: true };
    });
  }
}
