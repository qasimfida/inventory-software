import { ConflictException, HttpException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { canonicalJson } from '@inventory/domain';
import { offlineSaleSchema } from '@inventory/contracts';
import type { OfflineSale, SyncResult } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { SyncSales } from './sync-sales.js';
@Injectable()
export class SyncUpload {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(SyncSales) private readonly sales: SyncSales,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  async batch(actor: Actor, b: string, operations: OfflineSale[]) {
    const results: SyncResult[] = [];
    for (const op of operations) results.push(await this.one(actor, b, op));
    return { results };
  }
  one(actor: Actor, b: string, input: OfflineSale) {
    return this.scope.run(actor, b, 'sales.write', async (ctx) => {
      const lease = (
        await ctx.tx.query<{ warehouse_id: string }>(
          'SELECT warehouse_id FROM offline_leases WHERE business_id=$1 AND id=$2 AND actor_id=$3',
          [b, input.leaseId, actor.accountId],
        )
      ).rows[0];
      if (!lease) throw new ConflictException();
      await this.ledger.warehouse(ctx, lease.warehouse_id);
      const hash = createHash('sha256').update(canonicalJson(input)).digest('hex');
      const old = (
        await ctx.tx.query<{ request_hash: string; actor_id: string; result: SyncResult }>(
          'SELECT request_hash,actor_id,result FROM sync_operations WHERE business_id=$1 AND id=$2',
          [b, input.id],
        )
      ).rows[0];
      if (old) {
        if (old.actor_id !== actor.accountId || old.request_hash !== hash)
          throw new ConflictException();
        return old.result;
      }
      await ctx.tx.query('SAVEPOINT offline_command');
      let result: SyncResult;
      try {
        result = await this.sales.apply(ctx, input);
      } catch (error) {
        await ctx.tx.query('ROLLBACK TO SAVEPOINT offline_command');
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : error &&
                typeof error === 'object' &&
                'code' in error &&
                ['23503', '23505', '23514'].includes(String(error.code))
              ? 409
              : 0;
        if (![400, 403, 404, 409].includes(status)) throw error;
        result = {
          id: input.id,
          state: status === 409 ? 'conflict' : 'rejected',
          code: status === 409 ? 'REVIEW_REQUIRED' : 'NOT_ALLOWED',
        };
      }
      await ctx.tx.query(
        'INSERT INTO sync_operations(business_id,id,actor_id,lease_id,request_hash,payload,state,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [b, input.id, actor.accountId, input.leaseId, hash, input, result.state, result],
      );
      await audit(ctx, input.id, 'sync.' + result.state, null, { warehouseId: lease.warehouse_id });
      return result;
    });
  }
  review(actor: Actor, b: string, id: string, note: string) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      const op = (
        await ctx.tx.query<{ payload: unknown; state: string; result: SyncResult }>(
          'SELECT payload,state,result FROM sync_operations WHERE business_id=$1 AND id=$2',
          [b, id],
        )
      ).rows[0];
      if (!op) throw new ConflictException();
      if (op.state === 'synced') return op.result;
      const input = offlineSaleSchema.parse(op.payload),
        result = await this.sales.apply(ctx, input, true);
      await ctx.tx.query(
        "UPDATE sync_operations SET state='synced',result=$3,reviewed_by=$4,review_note=$5 WHERE business_id=$1 AND id=$2",
        [b, id, result, actor.accountId, note],
      );
      await audit(ctx, id, 'sync.reconciled', null, { saleId: result.saleId });
      return result;
    });
  }
}
