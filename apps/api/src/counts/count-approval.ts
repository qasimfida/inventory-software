import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { decimal, decimalString } from '@inventory/domain';
import type { CountCommand } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { idempotent } from '../database/idempotency.js';
import { balance, count, countDetail } from './count-repository.js';
@Injectable()
export class CountApproval {
  constructor(
    @Inject(OrganizationScope) private scope: OrganizationScope,
    @Inject(LedgerCore) private ledger: LedgerCore,
  ) {}
  approve(actor: Actor, b: string, id: string, input: CountCommand) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      const c = await count(ctx, id);
      await this.ledger.location(ctx, c.warehouseId, c.locationId);
      return idempotent(ctx, 'count.approve', input.idempotencyKey, { ...input, id }, async () => {
        if (c.state !== 'review' || c.version !== input.version) throw new ConflictException();
        const lines = (
          await ctx.tx.query<{
            id: string;
            variant_id: string;
            counted: string | null;
            expected: string;
            balance_version: number;
          }>(
            'SELECT id,variant_id,counted::text,expected::text,balance_version FROM stock_count_lines WHERE business_id=$1 AND count_id=$2',
            [b, id],
          )
        ).rows;
        for (const l of lines) {
          if (
            l.counted === null ||
            (await balance(ctx, c, l.variant_id)).version !== l.balance_version
          )
            throw new ConflictException('Stock moved during counting. Recount before approval.');
          const delta = decimal(l.counted) - decimal(l.expected);
          if (delta !== 0n)
            await this.ledger.apply(ctx, {
              variantId: l.variant_id,
              warehouseId: c.warehouseId,
              locationId: c.locationId,
              quantityDelta: decimalString(delta),
              type: delta > 0n ? 'adjustment_in' : 'adjustment_out',
              sourceKind: 'stock_count',
              sourceId: id,
              commandId: input.idempotencyKey,
              reason: input.reason,
            });
        }
        await ctx.tx.query(
          "UPDATE stock_counts SET state='approved',version=version+1,approved_by=$3,approved_at=now() WHERE business_id=$1 AND id=$2",
          [b, id, actor.accountId],
        );
        await audit(ctx, id, 'count.approved', null, {
          warehouseId: c.warehouseId,
          locationId: c.locationId,
          approvalReason: input.reason,
        });
        return countDetail(ctx, id);
      });
    });
  }
}
