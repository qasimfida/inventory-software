import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { DeltaQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { SyncCatalog } from './sync-catalog.js';
import { accessHash } from './sync-cursor.js';
@Injectable()
export class SyncDownload {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(SyncCatalog) private readonly catalog: SyncCatalog,
  ) {}
  pull(actor: Actor, b: string, q: DeltaQuery) {
    return this.scope.run(actor, b, 'products.read', async (ctx) => {
      const old = q.cursor
        ? (
            await ctx.tx.query<{ revision: string; access_hash: string; temporal: boolean }>(
              `SELECT revision::text,access_hash,(date_trunc('minute',created_at)<date_trunc('minute',now())) AS temporal FROM sync_cursors WHERE id=$1 AND business_id=$2 AND actor_id=$3 AND warehouse_id=$4 AND expires_at>now()`,
              [q.cursor, b, actor.accountId, q.warehouseId],
            )
          ).rows[0]
        : null;
      const reset = !!q.cursor && (!old || old.access_hash !== accessHash(ctx));
      const snapshot = await this.catalog.snapshot(ctx, q.warehouseId, q.currency);
      const changes =
        old && !reset
          ? (
              await ctx.tx.query<{ topic: string; variant_id: string | null }>(
                `SELECT topic,variant_id FROM sync_changes WHERE business_id=$1 AND revision>$2 AND revision<=$3 AND (warehouse_id IS NULL OR warehouse_id=$4) AND (store_id IS NULL OR store_id=$5) ORDER BY revision LIMIT 1001`,
                [b, old.revision, snapshot.revision, q.warehouseId, snapshot.storeId],
              )
            ).rows
          : [];
      const replaceAll =
          !old ||
          reset ||
          old.temporal ||
          changes.length > 1000 ||
          changes.some((c) => !c.variant_id),
        ids = new Set(changes.map((c) => c.variant_id).filter((v): v is string => !!v));
      return {
        actorId: ctx.actor.accountId,
        cursor: snapshot.cursor,
        revision: snapshot.revision,
        reset,
        replaceAll,
        items: replaceAll ? snapshot.items : snapshot.items.filter((i) => ids.has(i.id)),
        removed: replaceAll
          ? []
          : [...ids].filter((id) => !snapshot.items.some((i) => i.id === id)),
        topics: [...new Set(changes.map((c) => c.topic))],
      };
    });
  }
  head(actor: Actor, b: string, warehouseId: string) {
    return this.scope.run(actor, b, 'products.read', async (ctx) => {
      // A hint contains no entities or sensitive payload; location authorization is still mandatory.
      const wh = (
        await ctx.tx.query<{ store_id: string }>(
          'SELECT store_id FROM warehouses WHERE business_id=$1 AND id=$2',
          [b, warehouseId],
        )
      ).rows[0];
      if (
        !wh ||
        (ctx.business.scope?.storeId && ctx.business.scope.storeId !== wh.store_id) ||
        (ctx.business.scope?.warehouseId && ctx.business.scope.warehouseId !== warehouseId)
      )
        throw new ConflictException();
      return {
        revision: (
          await ctx.tx.query<{ revision: string }>(
            'SELECT COALESCE(max(revision),0)::text AS revision FROM sync_changes WHERE business_id=$1 AND (warehouse_id IS NULL OR warehouse_id=$2) AND (store_id IS NULL OR store_id=$3)',
            [b, warehouseId, wh.store_id],
          )
        ).rows[0]!.revision,
        clockVersion: Math.floor(Date.now() / 60000),
      };
    });
  }
}
