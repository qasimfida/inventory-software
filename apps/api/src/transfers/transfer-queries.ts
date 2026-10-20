import { Inject, Injectable } from '@nestjs/common';
import type { Transfer, TransferQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { TransferAccess } from './transfer-access.js';
import { transferProjection, transferDetail } from './transfer.repository.js';
@Injectable()
export class TransferQueries {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(TransferAccess) private readonly access: TransferAccess,
  ) {}
  load(actor: Actor, b: string, q: TransferQuery) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.access.ledger.warehouse(ctx, q.warehouseId);
      const rows = (
        await ctx.tx.query<Transfer & { createdAt: Date }>(
          `SELECT ${transferProjection} FROM stock_transfers t WHERE business_id=$1 AND (source_warehouse_id=$2 OR destination_warehouse_id=$2) AND reference ILIKE $3 AND ($4::uuid IS NULL OR (EXISTS(SELECT 1 FROM warehouses w WHERE w.business_id=$1 AND w.id=t.source_warehouse_id AND w.store_id=$4) AND EXISTS(SELECT 1 FROM warehouses w WHERE w.business_id=$1 AND w.id=t.destination_warehouse_id AND w.store_id=$4))) AND ($5::uuid IS NULL OR (source_warehouse_id=$5 AND destination_warehouse_id=$5)) ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $6`,
          [
            b,
            q.warehouseId,
            `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
            ctx.business.scope?.storeId ?? null,
            ctx.business.scope?.warehouseId ?? null,
            q.offset,
          ],
        )
      ).rows;
      return {
        transfers: rows.slice(0, 25).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        hasMore: rows.length > 25,
        offset: q.offset,
      };
    });
  }
  detail(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.access.get(ctx, id);
      return transferDetail(ctx, id);
    });
  }
}
