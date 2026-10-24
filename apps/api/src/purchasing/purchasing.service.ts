import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PurchaseAddLine,
  PurchaseInput,
  PurchaseTransition,
  SupplierInput,
} from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { detail, purchase } from './purchase.repository.js';
@Injectable()
export class PurchasingService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  addLine(actor: Actor, b: string, id: string, input: PurchaseAddLine) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      const order = await purchase(ctx, id);
      await this.ledger.warehouse(ctx, order.warehouseId);
      return idempotent(
        ctx,
        'purchase.addLine',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (order.state !== 'draft' || order.version !== input.version)
            throw new ConflictException();
          const count = Number(
            (
              await ctx.tx.query(
                'SELECT count(*) FROM purchase_lines WHERE business_id=$1 AND purchase_id=$2',
                [b, id],
              )
            ).rows[0]?.count,
          );
          if (count >= 50) throw new ConflictException();
          const active = await this.ledger.catalog.active(ctx, input.variantId);
          if (!active.product.trackInventory) throw new ConflictException();
          const converted = await this.ledger.catalog.quantity(
            ctx,
            input.variantId,
            input.unitId,
            input.quantity,
          );
          await ctx.tx.query(
            'INSERT INTO purchase_lines(id,business_id,purchase_id,variant_id,unit_id,quantity,base_quantity,unit_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              randomUUID(),
              b,
              id,
              input.variantId,
              input.unitId,
              input.quantity,
              converted.quantity,
              input.unitCost,
            ],
          );
          await ctx.tx.query(
            'UPDATE purchase_orders SET version=version+1 WHERE business_id=$1 AND id=$2',
            [b, id],
          );
          await audit(ctx, id, 'purchase.line.added', null, {
            warehouseId: order.warehouseId,
            variantId: input.variantId,
            quantity: input.quantity,
          });
          return detail(ctx, id);
        },
      );
    });
  }
  supplier(actor: Actor, b: string, input: SupplierInput, id?: string, version?: number) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      if (ctx.business.scope?.storeId) throw new ForbiddenException();
      const target = id ?? randomUUID();
      const values = [
        input.name,
        input.code,
        input.email,
        input.phone,
        input.notes,
        input.state,
        b,
        target,
      ];
      if (id) {
        const result = await ctx.tx.query(
          `UPDATE suppliers SET name=$1,code=$2,email=$3,phone=$4,notes=$5,state=$6,version=version+1 WHERE business_id=$7 AND id=$8 AND version=$9 AND state<>'archived' RETURNING id`,
          [...values, version],
        );
        if (!result.rowCount) throw new ConflictException();
      } else
        await ctx.tx.query(
          `INSERT INTO suppliers(name,code,email,phone,notes,state,business_id,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          values,
        );
      await audit(ctx, target, 'supplier.saved', null, {
        id: target,
        code: input.code,
        state: input.state,
      });
      return { id: target };
    });
  }
  create(actor: Actor, b: string, input: PurchaseInput) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      const wh = await this.ledger.warehouse(ctx, input.warehouseId);
      return idempotent(ctx, 'purchase.create', input.idempotencyKey, input, async () => {
        if (
          !(
            await ctx.tx.query(
              "SELECT 1 FROM suppliers WHERE business_id=$1 AND id=$2 AND state='active'",
              [b, input.supplierId],
            )
          ).rowCount
        )
          throw new ConflictException();
        const id = randomUUID();
        await ctx.tx.query(
          `INSERT INTO purchase_orders(id,business_id,supplier_id,warehouse_id,currency,state,reference,actor_id) VALUES($1,$2,$3,$4,$5,'draft',$6,$7)`,
          [
            id,
            b,
            input.supplierId,
            input.warehouseId,
            input.currency,
            input.reference,
            actor.accountId,
          ],
        );
        for (const item of input.lines) {
          const active = await this.ledger.catalog.active(ctx, item.variantId);
          if (!active.product.trackInventory) throw new ConflictException();
          const conversion = await this.ledger.catalog.quantity(
            ctx,
            item.variantId,
            item.unitId,
            item.quantity,
          );
          await ctx.tx.query(
            `INSERT INTO purchase_lines(id,business_id,purchase_id,variant_id,unit_id,quantity,base_quantity,unit_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              randomUUID(),
              b,
              id,
              item.variantId,
              item.unitId,
              item.quantity,
              conversion.quantity,
              item.unitCost,
            ],
          );
        }
        await audit(ctx, id, 'purchase.created', null, { ...input, storeId: wh.storeId });
        return detail(ctx, id);
      });
    });
  }
  transition(actor: Actor, b: string, id: string, input: PurchaseTransition) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      const current = await purchase(ctx, id),
        wh = await this.ledger.warehouse(ctx, current.warehouseId);
      return idempotent(
        ctx,
        'purchase.transition',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (current.version !== input.version) throw new ConflictException();
          const valid =
            input.action === 'approve'
              ? current.state === 'draft'
              : input.action === 'order'
                ? current.state === 'approved'
                : ['draft', 'approved', 'ordered', 'partially_received'].includes(current.state);
          if (!valid) throw new ConflictException();
          const state =
            input.action === 'approve'
              ? 'approved'
              : input.action === 'order'
                ? 'ordered'
                : 'cancelled';
          await ctx.tx.query(
            'UPDATE purchase_orders SET state=$1,version=version+1 WHERE business_id=$2 AND id=$3',
            [state, b, id],
          );
          await audit(ctx, id, `purchase.${input.action}`, current, {
            ...current,
            state,
            ...(input.action === 'approve' ? { approvalReason: input.reason } : {}),
            storeId: wh.storeId,
          });
          return detail(ctx, id);
        },
      );
    });
  }
}
