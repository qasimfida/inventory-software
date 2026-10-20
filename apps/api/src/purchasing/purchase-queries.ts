import { Inject, Injectable } from '@nestjs/common';
import type { PurchaseQuery, Purchase } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { detail, purchase, orderProjection } from './purchase.repository.js';
@Injectable()
export class PurchaseQueries {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  workspace(actor: Actor, b: string, q: PurchaseQuery) {
    return this.scope.run(actor, b, 'purchases.read', async (ctx) => {
      await this.ledger.warehouse(ctx, q.warehouseId);
      const search = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      const suppliers = (
        await ctx.tx.query(
          'SELECT id,name,code,email,phone,notes,state,version FROM suppliers WHERE business_id=$1 AND (name ILIKE $2 OR code ILIKE $2) ORDER BY lower(name),id LIMIT 26 OFFSET $3',
          [b, search, q.offset],
        )
      ).rows;
      const orders = (
        await ctx.tx.query<Purchase & { createdAt: Date }>(
          `SELECT ${orderProjection} FROM purchase_orders WHERE business_id=$1 AND warehouse_id=$2 AND ($3::uuid IS NULL OR supplier_id=$3) AND reference ILIKE $4 ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $5`,
          [b, q.warehouseId, q.supplierId ?? null, search, q.offset],
        )
      ).rows;
      return {
        suppliers: suppliers.slice(0, 25),
        orders: orders.slice(0, 25).map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
        offset: q.offset,
        hasMore: suppliers.length > 25 || orders.length > 25,
      };
    });
  }
  detail(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'purchases.read', async (ctx) => {
      const order = await purchase(ctx, id);
      await this.ledger.warehouse(ctx, order.warehouseId);
      return detail(ctx, id);
    });
  }
}
