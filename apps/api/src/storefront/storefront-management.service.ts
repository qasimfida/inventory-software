import { listingPage } from './storefront-management-queries.js';
import { PricingService } from '../catalog/pricing.service.js';
import { productDetail, pickerPage } from './storefront-product-reads.js';
import type { OnlinePickerQuery } from '@inventory/contracts';
import { managementSettings } from './storefront-management-records.js';
import { previewOnlineImage } from './storefront-media.js';
import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { hasPermission, onlineCommandSchema, listingQuerySchema } from '@inventory/contracts';
import type { OnlineCommand, ListingQuery } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { idempotent } from '../database/idempotency.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { StorefrontProjection } from './storefront-projection.js';
import { executeManagement } from './storefront-management-commands.js';
import { readManagement } from './storefront-management-read.js';
@Injectable()
export class StorefrontManagementService {
  constructor(
    @Inject(PricingService) private pricing: PricingService,
    @Inject(ENVIRONMENT) private env: Environment,
    @Inject(OrganizationScope) private scope: OrganizationScope,
    @Inject(StorefrontProjection) private projection: StorefrontProjection,
    @Inject(RateLimitService) private limits: RateLimitService,
  ) {}
  async run<T>(
    actor: Actor,
    b: string,
    s: string,
    write: boolean,
    work: (ctx: OrganizationContext) => Promise<T>,
  ) {
    await this.limits.consume(
      `storefront:${actor.accountId}:${b}:${write ? 'write' : 'read'}`,
      write ? 120 : 900,
    );
    return this.scope.run(actor, b, write ? 'onlineStore.manage' : 'business.read', async (ctx) => {
      if (
        !write &&
        !hasPermission(ctx.business, 'onlineStore.view') &&
        !hasPermission(ctx.business, 'onlineStore.manage')
      )
        throw new ForbiddenException();
      if (
        ctx.business.scope?.warehouseId ||
        (ctx.business.scope?.storeId && ctx.business.scope.storeId !== s)
      )
        throw new ForbiddenException();
      if (
        !(
          await ctx.tx.query(
            "SELECT 1 FROM stores WHERE business_id=$1 AND id=$2 AND state='active'",
            [b, s],
          )
        ).rowCount
      )
        throw new NotFoundException();
      return work(ctx);
    });
  }
  read(
    actor: Actor,
    b: string,
    s: string,
    kind: 'settings' | 'overview' | 'listings' | 'slug' | 'host' | 'history',
    q: ListingQuery = listingQuerySchema.parse({}),
    value = '',
  ) {
    return this.run(actor, b, s, false, (ctx) =>
      readManagement(ctx, s, kind, q, value, this.env.storefrontMediaOrigins),
    );
  }
  productPage(actor: Actor, b: string, s: string, q: ListingQuery) {
    return this.run(actor, b, s, false, async (ctx) => {
      const page = await listingPage(ctx, s, { ...q, limit: Math.min(q.limit, 25) });
      const previews: Record<string, Awaited<ReturnType<typeof productDetail>>['preview']> = {};
      for (const item of page.items)
        previews[item.id] = (
          await productDetail(ctx, s, item.id, this.pricing, this.env.storefrontMediaOrigins)
        ).preview;
      return { page, previews };
    });
  }
  detail(actor: Actor, b: string, s: string, id: string) {
    return this.run(actor, b, s, false, (ctx) =>
      productDetail(ctx, s, id, this.pricing, this.env.storefrontMediaOrigins),
    );
  }
  picker(actor: Actor, b: string, s: string, q: OnlinePickerQuery) {
    return this.run(actor, b, s, false, (ctx) => {
      if (!hasPermission(ctx.business, 'products.read')) throw new ForbiddenException();
      return pickerPage(ctx, s, q, this.pricing, this.env.storefrontMediaOrigins);
    });
  }
  async image(actor: Actor, b: string, s: string, url: string) {
    await this.limits.consume(`storefront:media:${actor.accountId}:${b}`, 30);
    const hosts = await this.run(
      actor,
      b,
      s,
      false,
      async (ctx) =>
        (await managementSettings(ctx, s, this.env.storefrontMediaOrigins))?.allowedImageHosts ??
        [],
    );
    const result = await previewOnlineImage(url, hosts);
    return this.run(actor, b, s, false, async (ctx) => {
      const current =
        (await managementSettings(ctx, s, this.env.storefrontMediaOrigins))?.allowedImageHosts ??
        [];
      return current.join(',') === hosts.join(',')
        ? result
        : {
            status: 'host_not_allowed' as const,
            message: 'Image sources changed. Reload and test again.',
          };
    });
  }
  command(actor: Actor, b: string, s: string, raw: OnlineCommand) {
    const input = onlineCommandSchema.parse(raw);
    return this.run(actor, b, s, true, (ctx) =>
      idempotent(ctx, `storefront:${s}`, input.idempotencyKey, input, async () => {
        const result = await executeManagement(
          ctx,
          s,
          input,
          this.projection,
          this.env.storefrontMediaOrigins,
        );
        await audit(ctx, s, 'storefront.command', null, {
          storeId: s,
          reasonCode: input.action,
          quantity: result.items.length,
        });
        return result;
      }),
    );
  }
}
