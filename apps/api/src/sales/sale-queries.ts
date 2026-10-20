import { LocationAccess } from '../organization/location-access.js';
import { Inject, Injectable } from '@nestjs/common';
import type { Sale, SaleQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { CatalogSearch } from '../catalog/catalog-search.js';
import { getSale, saleProjection, saleReceipt } from './sale.repository.js';
@Injectable()
export class SaleQueries {
  constructor(
    @Inject(LocationAccess) private readonly locations: LocationAccess,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
    @Inject(CatalogSearch) private readonly catalog: CatalogSearch,
  ) {}
  items(actor: Actor, b: string, q: SaleQuery) {
    return this.scope.run(actor, b, 'sales.write', async (ctx) => {
      await this.ledger.warehouse(ctx, q.warehouseId);
      return this.catalog.pos(ctx, q);
    });
  }
  page(actor: Actor, b: string, q: SaleQuery) {
    return this.scope.run(actor, b, 'sales.read', async (ctx) => {
      await this.locations.warehouse(ctx, q.warehouseId);
      const rows = (
        await ctx.tx.query<Sale & { createdAt: Date }>(
          `SELECT ${saleProjection} FROM sales WHERE business_id=$1 AND warehouse_id=$2 AND id::text ILIKE $3 ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $4`,
          [b, q.warehouseId, `%${q.search.replace(/[\\%_]/g, '\\$&')}%`, q.offset],
        )
      ).rows;
      return {
        sales: rows.slice(0, 25).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        hasMore: rows.length > 25,
        offset: q.offset,
      };
    });
  }
  receipt(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'sales.read', async (ctx) => {
      const sale = await getSale(ctx, id);
      await this.locations.warehouse(ctx, sale.warehouseId);
      return saleReceipt(ctx, id);
    });
  }
}
