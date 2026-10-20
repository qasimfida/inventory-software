import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CountCreate, CountCapture, CountCommand } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { idempotent } from '../database/idempotency.js';
import { balance, count, countDetail, countProjection } from './count-repository.js';
@Injectable()
export class CountService {
  constructor(
    @Inject(OrganizationScope) private scope: OrganizationScope,
    @Inject(LedgerCore) private ledger: LedgerCore,
  ) {}
  list(actor: Actor, b: string, warehouseId: string) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.ledger.warehouse(ctx, warehouseId);
      return {
        counts: (
          await ctx.tx.query(
            `SELECT ${countProjection} FROM stock_counts WHERE business_id=$1 AND warehouse_id=$2 ORDER BY created_at DESC LIMIT 100`,
            [b, warehouseId],
          )
        ).rows,
      };
    });
  }
  detail(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      const c = await count(ctx, id);
      await this.ledger.warehouse(ctx, c.warehouseId);
      return countDetail(ctx, id);
    });
  }
  create(actor: Actor, b: string, input: CountCreate) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const target = await this.ledger.location(ctx, input.warehouseId, input.locationId);
      return idempotent(ctx, 'count.create', input.idempotencyKey, input, async () => {
        const id = randomUUID();
        await ctx.tx.query(
          'INSERT INTO stock_counts(id,business_id,warehouse_id,location_id,blind,created_by) VALUES($1,$2,$3,$4,$5,$6)',
          [id, b, input.warehouseId, target.id, input.blind, actor.accountId],
        );
        for (const variantId of input.variantIds) {
          const { product } = await this.ledger.catalog.active(ctx, variantId);
          if (!product.trackInventory) throw new ConflictException();
          const snapshot = await balance(
            ctx,
            { warehouseId: input.warehouseId, locationId: target.id },
            variantId,
          );
          await ctx.tx.query(
            'INSERT INTO stock_count_lines(id,business_id,count_id,variant_id,expected,balance_version) VALUES($1,$2,$3,$4,$5,$6)',
            [randomUUID(), b, id, variantId, snapshot.on_hand, snapshot.version],
          );
        }
        await audit(ctx, id, 'count.created', null, {
          warehouseId: input.warehouseId,
          locationId: target.id,
        });
        return countDetail(ctx, id);
      });
    });
  }
  capture(actor: Actor, b: string, id: string, input: CountCapture) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const c = await count(ctx, id);
      await this.ledger.location(ctx, c.warehouseId, c.locationId);
      return idempotent(ctx, 'count.capture', input.idempotencyKey, { ...input, id }, async () => {
        if (c.state !== 'draft' || c.version !== input.version) throw new ConflictException();
        const exists = await ctx.tx.query(
          'SELECT id FROM stock_count_lines WHERE business_id=$1 AND count_id=$2 AND variant_id=$3',
          [b, id, input.variantId],
        );
        if (!exists.rowCount) throw new NotFoundException();
        const converted = await this.ledger.catalog.quantity(
          ctx,
          input.variantId,
          input.unitId,
          input.quantity,
          true,
        );
        await ctx.tx.query(
          'UPDATE stock_count_lines SET counted=$4,unit_id=$5,quantity=$6,counted_by=$7,counted_at=now(),attempt=attempt+1 WHERE business_id=$1 AND count_id=$2 AND variant_id=$3',
          [
            b,
            id,
            input.variantId,
            converted.quantity,
            input.unitId,
            input.quantity,
            actor.accountId,
          ],
        );
        await ctx.tx.query(
          'UPDATE stock_counts SET version=version+1 WHERE business_id=$1 AND id=$2',
          [b, id],
        );
        await audit(ctx, id, 'count.captured', null, {
          warehouseId: c.warehouseId,
          locationId: c.locationId,
          variantId: input.variantId,
          quantity: converted.quantity,
        });
        return countDetail(ctx, id);
      });
    });
  }
  transition(
    actor: Actor,
    b: string,
    id: string,
    action: 'submit' | 'recount',
    input: CountCommand,
  ) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const c = await count(ctx, id);
      await this.ledger.location(ctx, c.warehouseId, c.locationId);
      return idempotent(
        ctx,
        'count.' + action,
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (c.version !== input.version || c.state === 'approved') throw new ConflictException();
          if (action === 'submit') {
            if (
              c.state !== 'draft' ||
              (
                await ctx.tx.query(
                  'SELECT 1 FROM stock_count_lines WHERE business_id=$1 AND count_id=$2 AND counted IS NULL',
                  [b, id],
                )
              ).rowCount
            )
              throw new ConflictException();
          } else {
            const lines = (
              await ctx.tx.query<{ variant_id: string }>(
                'SELECT variant_id FROM stock_count_lines WHERE business_id=$1 AND count_id=$2',
                [b, id],
              )
            ).rows;
            for (const l of lines) {
              const snapshot = await balance(ctx, c, l.variant_id);
              await ctx.tx.query(
                'UPDATE stock_count_lines SET expected=$4,balance_version=$5,counted=NULL,quantity=NULL,unit_id=NULL,counted_by=NULL,counted_at=NULL WHERE business_id=$1 AND count_id=$2 AND variant_id=$3',
                [b, id, l.variant_id, snapshot.on_hand, snapshot.version],
              );
            }
          }
          await ctx.tx.query(
            'UPDATE stock_counts SET state=$3,version=version+1 WHERE business_id=$1 AND id=$2',
            [b, id, action === 'submit' ? 'review' : 'draft'],
          );
          await audit(ctx, id, 'count.' + action, null, {
            warehouseId: c.warehouseId,
            locationId: c.locationId,
            reason: input.reason,
          });
          return countDetail(ctx, id);
        },
      );
    });
  }
}
