import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString } from '@inventory/domain';
import type { TransferReceive } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { TransferAccess } from './transfer-access.js';
import { transferLines, transferDetail, transferEvent } from './transfer.repository.js';
@Injectable()
export class TransferReceiving {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(TransferAccess) private readonly access: TransferAccess,
  ) {}
  receive(actor: Actor, b: string, id: string, input: TransferReceive) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const current = await this.access.get(ctx, id),
        ledger = this.access.ledger;
      return idempotent(
        ctx,
        'transfer.receive',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (!['dispatched', 'partially_received'].includes(current.state))
            throw new ConflictException();
          const line = (await transferLines(ctx, id)).find((l) => l.id === input.lineId);
          if (!line) throw new NotFoundException();
          // Receipt quantities use the immutable base stock unit shown on the transfer, never a client-supplied conversion.
          const good = decimal(input.received),
            damaged = decimal(input.damaged),
            shortage = decimal(input.shortage),
            settled = good + damaged + shortage;
          if (settled <= 0n || decimal(line.settled) + settled > decimal(line.baseQuantity))
            throw new ConflictException();
          const receiptId = randomUUID(),
            common = {
              variantId: line.variantId,
              sourceKind: 'transfer_receive',
              sourceId: receiptId,
              commandId: input.idempotencyKey,
              reason: input.reason,
            };
          if (good + damaged > 0n) {
            await ledger.apply(ctx, {
              ...common,
              warehouseId: current.sourceWarehouseId,
              locationId: current.sourceLocationId,
              quantityDelta: '0',
              transitDelta: decimalString(-(good + damaged)),
              type: 'transfer_receive',
            });
            await ledger.apply(ctx, {
              ...common,
              warehouseId: current.destinationWarehouseId,
              locationId: current.destinationLocationId,
              quantityDelta: decimalString(good + damaged),
              damagedDelta: input.damaged,
              type: damaged > 0n ? 'transfer_damage' : 'transfer_receive',
            });
          }
          if (shortage > 0n)
            await ledger.apply(ctx, {
              ...common,
              warehouseId: current.sourceWarehouseId,
              locationId: current.sourceLocationId,
              quantityDelta: '0',
              transitDelta: decimalString(-shortage),
              type: 'transfer_shortage',
            });
          await ctx.tx.query(
            'INSERT INTO transfer_receipts(id,business_id,line_id,received,damaged,shortage,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              receiptId,
              b,
              line.id,
              input.received,
              input.damaged,
              input.shortage,
              actor.accountId,
              input.reason,
            ],
          );
          await ctx.tx.query(
            'UPDATE transfer_lines SET settled=settled+$1 WHERE business_id=$2 AND id=$3',
            [decimalString(settled), b, line.id],
          );
          const complete = !(
              await ctx.tx.query(
                'SELECT 1 FROM transfer_lines WHERE business_id=$1 AND transfer_id=$2 AND settled<base_quantity LIMIT 1',
                [b, id],
              )
            ).rowCount,
            state = complete ? 'completed' : 'partially_received';
          await ctx.tx.query(
            'UPDATE stock_transfers SET state=$1,version=version+1 WHERE business_id=$2 AND id=$3',
            [state, b, id],
          );
          await transferEvent(ctx, { ...current, state }, 'receive', input.reason);
          return transferDetail(ctx, id);
        },
      );
    });
  }
}
