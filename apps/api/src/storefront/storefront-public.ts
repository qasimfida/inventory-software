import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { publicStorefrontSchema, publicProductSchema } from '@inventory/contracts';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { StorefrontProjection } from './storefront-projection.js';
import { settings, prerequisites } from './storefront-records.js';
@Injectable()
export class StorefrontPublic {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(StorefrontProjection) private projection: StorefrontProjection,
  ) {}
  async refresh(
    businessId: string,
    publicQuery?: { slug: string; offset: number; limit: number },
    storeId?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const business = (
        await tx.query<{ id: string; name: string; state: string; version: number }>(
          'SELECT id,name,state,version FROM businesses WHERE id=$1 FOR UPDATE',
          [businessId],
        )
      ).rows[0];
      const row = (
        await tx.query<{ actor_id: string; next_full_check: Date }>(
          'SELECT actor_id,next_full_check FROM storefront_settings WHERE business_id=$1 AND ($2::uuid IS NULL OR store_id=$2) AND ($3::text IS NULL OR slug=$3) ORDER BY store_id LIMIT 1',
          [businessId, storeId ?? null, publicQuery?.slug ?? null],
        )
      ).rows[0];
      if (!business || !row || business.state !== 'active') throw new NotFoundException();
      // Internal publication maintenance only. Never used to authorize guest writes.
      const ctx: OrganizationContext = {
        tx,
        business: { ...business, state: 'active', role: 'custom', permissions: ['products.read'] },
        actor: { accountId: row.actor_id, requestId: randomUUID() },
      };
      const config = await settings(ctx, storeId);
      if (!config) throw new NotFoundException();
      if (
        publicQuery &&
        (!config.enabled ||
          config.slug !== publicQuery.slug ||
          (await prerequisites(ctx, config)).length)
      )
        throw new NotFoundException();
      const pending =
        !publicQuery && row.next_full_check.getTime() > Date.now()
          ? (
              await tx.query<{ product_id: string }>(
                'SELECT product_id FROM storefront_revalidation WHERE business_id=$1 AND store_id=$2 AND due_at<=now() ORDER BY product_id LIMIT 200',
                [businessId, config.storeId],
              )
            ).rows.map((r) => r.product_id)
          : undefined;
      await this.projection.refresh(ctx, config, pending);
      if (!publicQuery) return null;
      const selected = (
        await tx.query(
          "SELECT projection FROM channel_listings WHERE business_id=$1 AND store_id=$5 AND state='active' AND (online_overrides->>'visible')::boolean AND projection IS NOT NULL AND ($2=false OR projection->>'availability'<>'sold_out') ORDER BY id LIMIT $3 OFFSET $4",
          [
            businessId,
            config.hideSoldOut,
            publicQuery.limit + 1,
            publicQuery.offset,
            config.storeId,
          ],
        )
      ).rows;
      return publicStorefrontSchema.parse({
        name: config.name,
        slug: config.slug,
        contact: config.contact,
        returnPolicy: config.returnPolicy,
        shippingPolicy: config.shippingPolicy,
        currency: config.currency,
        items: selected
          .slice(0, publicQuery.limit)
          .map((row) => publicProductSchema.parse(row.projection)),
        hasMore: selected.length > publicQuery.limit,
        offset: publicQuery.offset,
      });
    });
  }
  async read(slug: string, page: { offset: number; limit: number }) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60 || slug.length < 3)
      throw new NotFoundException();
    const row = (
      await this.db.query<{ business_id: string; store_id: string }>(
        'SELECT business_id,store_id FROM storefront_settings WHERE slug=$1',
        [slug],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return this.refresh(row.business_id, { slug, ...page }, row.store_id);
  }
}
