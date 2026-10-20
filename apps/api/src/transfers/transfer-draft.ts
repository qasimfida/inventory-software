import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TransferAddLine } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { TransferAccess } from './transfer-access.js';
import { transferLines, transferDetail, transferEvent } from './transfer.repository.js';
@Injectable()
export class TransferDraft {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(TransferAccess) private readonly access: TransferAccess,
  ) {}
  addLine(actor: Actor, b: string, id: string, input: TransferAddLine) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const current = await this.access.get(ctx, id);
      return idempotent(
        ctx,
        'transfer.addLine',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (
            current.state !== 'draft' ||
            current.version !== input.version ||
            (await transferLines(ctx, id)).length >= 50
          )
            throw new ConflictException();
          const active = await this.access.ledger.catalog.active(ctx, input.variantId);
          if (!active.product.trackInventory) throw new ConflictException();
          const converted = await this.access.ledger.catalog.quantity(
            ctx,
            input.variantId,
            input.unitId,
            input.quantity,
          );
          await ctx.tx.query(
            'INSERT INTO transfer_lines(id,business_id,transfer_id,variant_id,unit_id,quantity,base_quantity) VALUES($1,$2,$3,$4,$5,$6,$7)',
            [
              randomUUID(),
              b,
              id,
              input.variantId,
              input.unitId,
              input.quantity,
              converted.quantity,
            ],
          );
          await ctx.tx.query(
            'UPDATE stock_transfers SET version=version+1 WHERE business_id=$1 AND id=$2',
            [b, id],
          );
          await transferEvent(ctx, current, 'line_added', 'Draft line added');
          return transferDetail(ctx, id);
        },
      );
    });
  }
}
