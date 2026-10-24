import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { currencySchema, offlineItemSchema, hasPermission } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { revision, cursor } from './sync-cursor.js';
@Injectable()
export class SyncCatalog {
  constructor(@Inject(LedgerCore) private readonly ledger: LedgerCore) {}
  async snapshot(ctx: OrganizationContext, warehouseId: string, currency: string) {
    const wh = await this.ledger.warehouse(ctx, warehouseId);
    if (!hasPermission(ctx.business, 'products.read') || !hasPermission(ctx.business, 'stock.read'))
      throw new ConflictException();
    const variants = (
      await ctx.tx.query<{ id: string; name: string; sku: string; track: boolean }>(
        `SELECT v.id,v.name,v.sku,p.track_inventory AS track FROM catalog_variants v JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id WHERE v.business_id=$1 AND v.state='active' AND p.state='active' ORDER BY v.id LIMIT 251`,
        [ctx.business.id],
      )
    ).rows;
    if (variants.length > 250)
      throw new ConflictException('Offline dataset exceeds supported snapshot size.');
    const items = [];
    for (const v of variants) {
      const price = (
        await ctx.tx.query(
          `SELECT id AS "priceId",unit_price::text AS "unitPrice",currency,tax_basis_points AS "taxBasisPoints",tax_inclusive AS "taxInclusive" FROM price_entries WHERE business_id=$1 AND variant_id=$2 AND customer_id IS NULL AND (store_id IS NULL OR store_id=$3) AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now()) ORDER BY (store_id IS NOT NULL) DESC,starts_at DESC,id DESC LIMIT 1`,
          [ctx.business.id, v.id, wh.storeId],
        )
      ).rows[0];
      if (!price || price.currency !== currency) continue;
      const units = (
        await ctx.tx.query(
          `SELECT u.id,u.code,COALESCE(c.numerator,1)::text AS numerator,COALESCE(c.denominator,1)::text AS denominator FROM catalog_units u JOIN catalog_variants v ON v.business_id=u.business_id LEFT JOIN catalog_conversions c ON c.business_id=v.business_id AND c.variant_id=v.id AND c.unit_id=u.id WHERE v.business_id=$1 AND v.id=$2 AND (u.id=v.base_unit_id OR c.unit_id IS NOT NULL) ORDER BY u.code`,
          [ctx.business.id, v.id],
        )
      ).rows;
      const promotions = (
        await ctx.tx.query(
          `SELECT p.id,p.discount_basis_points AS "discountBasisPoints",p.minimum_quantity::text AS "minimumQuantity" FROM price_promotions p WHERE p.business_id=$1 AND p.variant_id=$2 AND (p.store_id IS NULL OR p.store_id=$3) AND p.starts_at<=now() AND (p.ends_at IS NULL OR p.ends_at>now()) AND NOT EXISTS(SELECT 1 FROM promotion_withdrawals w WHERE w.business_id=p.business_id AND w.promotion_id=p.id) ORDER BY p.priority DESC,(p.store_id IS NOT NULL) DESC,p.id`,
          [ctx.business.id, v.id, wh.storeId],
        )
      ).rows;
      const barcodes = (
        await ctx.tx.query<{ code: string }>(
          'SELECT code FROM catalog_identifiers WHERE business_id=$1 AND coalesce(variant_id,product_id)=$2',
          [ctx.business.id, v.id],
        )
      ).rows.map((i) => i.code);
      const balance = (
        await ctx.tx.query<{ available: string }>(
          'SELECT (on_hand-reserved-damaged)::text AS available FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 AND location_id=$2 AND variant_id=$3',
          [ctx.business.id, wh.id, v.id],
        )
      ).rows[0];
      items.push(
        offlineItemSchema.parse({
          ...v,
          ...price,
          trackInventory: v.track,
          units,
          promotions,
          barcodes,
          available: balance?.available ?? '0',
        }),
      );
    }
    const rev = await revision(ctx);
    return {
      warehouseId,
      storeId: wh.storeId!,
      currency: currencySchema.parse(currency),
      revision: rev,
      items,
      cursor: await cursor(ctx, warehouseId, rev, currency),
    };
  }
}
