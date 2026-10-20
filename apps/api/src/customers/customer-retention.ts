import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { remainingSql } from './receivable-core.js';
@Injectable()
export class CustomerRetention {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  read(actor: Actor, b: string) {
    return this.scope.run(
      actor,
      b,
      'business.write',
      async (ctx) =>
        (
          await ctx.tx.query(
            'SELECT inactive_days AS "inactiveDays",version FROM customer_retention WHERE business_id=$1',
            [b],
          )
        ).rows[0] ?? { inactiveDays: 365, version: 1 },
    );
  }
  save(actor: Actor, b: string, input: { inactiveDays: number; version: number }) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      await ctx.tx.query(
        'INSERT INTO customer_retention(business_id) VALUES($1) ON CONFLICT DO NOTHING',
        [b],
      );
      if (
        !(
          await ctx.tx.query(
            'UPDATE customer_retention SET inactive_days=$1,version=version+1 WHERE business_id=$2 AND version=$3 RETURNING business_id',
            [input.inactiveDays, b, input.version],
          )
        ).rowCount
      )
        throw new ConflictException();
      await audit(ctx, b, 'customer.retention-policy', null, { days: input.inactiveDays });
      return { ok: true };
    });
  }
  run(actor: Actor, b: string) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      const days = Number(
        (
          await ctx.tx.query('SELECT inactive_days FROM customer_retention WHERE business_id=$1', [
            b,
          ])
        ).rows[0]?.inactive_days ?? 365,
      );
      const rows = (
        await ctx.tx.query<{ id: string; storeId: string }>(
          `UPDATE customers c SET code='A-'||replace(c.id::text,'-',''),name='Anonymized customer',email='',phone='',address='',notes='',state='archived',anonymized_at=now(),version=version+1 WHERE c.business_id=$1 AND c.state<>'active' AND c.anonymized_at IS NULL AND c.last_activity_at<now()-($2::integer*interval '1 day') AND NOT EXISTS(SELECT 1 FROM customer_receivables r WHERE r.business_id=c.business_id AND r.customer_id=c.id AND (${remainingSql})<>0) RETURNING c.id,c.store_id AS "storeId"`,
          [b, days],
        )
      ).rows;
      for (const row of rows)
        await audit(ctx, row.id, 'customer.anonymized', null, {
          customerId: row.id,
          storeId: row.storeId,
        });
      return { anonymized: rows.length };
    });
  }
}
