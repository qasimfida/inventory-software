import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { StaffInput, CostInput, CostPayment } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
const staffProjection = `id,code,name,title,store_id AS "storeId",salary_minor::text AS "salaryMinor",currency,state,version`;
const costProjection = `c.id,c.kind,c.staff_id AS "staffId",c.store_id AS "storeId",c.description,c.reference,c.period_start::text AS "periodStart",c.period_end::text AS "periodEnd",c.amount_minor::text AS "amountMinor",c.currency,COALESCE((SELECT sum(p.amount_minor) FROM operational_cost_payments p WHERE p.business_id=c.business_id AND p.cost_id=c.id),0)::text AS "paidMinor"`;
@Injectable()
export class OperationsService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  private run<T>(actor: Actor, b: string, work: (ctx: OrganizationContext) => Promise<T>) {
    return this.scope.run(actor, b, 'users.write', async (ctx) => {
      // Salaries are owner/platform administration, never exposed through ordinary payment read access.
      if (ctx.business.scope?.storeId) throw new ForbiddenException();
      return work(ctx);
    });
  }
  private async store(ctx: OrganizationContext, id: string | null) {
    if (
      id &&
      !(
        await ctx.tx.query(
          "SELECT 1 FROM stores WHERE business_id=$1 AND id=$2 AND state='active'",
          [ctx.business.id, id],
        )
      ).rowCount
    )
      throw new NotFoundException();
  }
  list(actor: Actor, b: string, q: { search: string; offset: number }) {
    return this.run(actor, b, async (ctx) => {
      const staff = (
        await ctx.tx.query(
          `SELECT ${staffProjection} FROM staff_records WHERE business_id=$1 AND (name ILIKE $2 OR code ILIKE $2) ORDER BY name,id LIMIT 26 OFFSET $3`,
          [b, `%${q.search}%`, q.offset],
        )
      ).rows;
      const costs = (
        await ctx.tx.query(
          `SELECT ${costProjection} FROM operational_costs c WHERE c.business_id=$1 AND (c.description ILIKE $2 OR c.reference ILIKE $2) ORDER BY c.created_at DESC,c.id LIMIT 26 OFFSET $3`,
          [b, `%${q.search}%`, q.offset],
        )
      ).rows;
      return {
        staff: staff.slice(0, 25),
        costs: costs.slice(0, 25),
        staffHasMore: staff.length > 25,
        costsHasMore: costs.length > 25,
      };
    });
  }
  save(actor: Actor, b: string, input: StaffInput, id?: string, version?: number) {
    return this.run(actor, b, async (ctx) => {
      await this.store(ctx, input.storeId);
      const args = [
        b,
        input.code,
        input.name,
        input.title,
        input.storeId,
        input.salaryMinor,
        input.currency,
        input.state,
      ];
      const row = id
        ? (
            await ctx.tx.query(
              `UPDATE staff_records SET code=$2,name=$3,title=$4,store_id=$5,salary_minor=$6,currency=$7,state=$8,version=version+1 WHERE business_id=$1 AND id=$9 AND version=$10 RETURNING ${staffProjection}`,
              [...args, id, version],
            )
          ).rows[0]
        : (
            await ctx.tx.query(
              `INSERT INTO staff_records(business_id,code,name,title,store_id,salary_minor,currency,state,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${staffProjection}`,
              [...args, randomUUID()],
            )
          ).rows[0];
      if (!row) throw new ConflictException();
      await audit(ctx, row.id, 'staff.saved', null, { id: row.id, storeId: input.storeId });
      return row;
    });
  }
  cost(actor: Actor, b: string, input: CostInput) {
    return this.run(actor, b, (ctx) =>
      idempotent(ctx, 'operations.cost', input.idempotencyKey, input, async () => {
        await this.store(ctx, input.storeId);
        if (input.staffId) {
          const staff = (
            await ctx.tx.query(
              "SELECT currency,store_id FROM staff_records WHERE business_id=$1 AND id=$2 AND state='active'",
              [b, input.staffId],
            )
          ).rows[0];
          if (!staff || staff.currency !== input.currency || staff.store_id !== input.storeId)
            throw new ConflictException(
              'Select an active employee with matching store and currency.',
            );
          if (
            (
              await ctx.tx.query(
                `SELECT 1 FROM operational_costs WHERE business_id=$1 AND staff_id=$2 AND period_start<=$4::date AND period_end>=$3::date`,
                [b, input.staffId, input.periodStart, input.periodEnd],
              )
            ).rowCount
          )
            throw new ConflictException('Salary period overlaps an existing record.');
        }
        const id = randomUUID();
        await ctx.tx.query(
          `INSERT INTO operational_costs(id,business_id,store_id,staff_id,kind,description,reference,period_start,period_end,amount_minor,currency,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            id,
            b,
            input.storeId,
            input.staffId,
            input.kind,
            input.description,
            input.reference,
            input.periodStart,
            input.periodEnd,
            input.amountMinor,
            input.currency,
            actor.accountId,
          ],
        );
        await audit(ctx, id, 'operations.cost.created', null, {
          id,
          storeId: input.storeId,
          kind: input.kind,
        });
        return { id };
      }),
    );
  }
  detail(actor: Actor, b: string, id: string, offset: number) {
    return this.run(actor, b, async (ctx) => {
      const cost = (
        await ctx.tx.query(
          `SELECT ${costProjection} FROM operational_costs c WHERE c.business_id=$1 AND c.id=$2`,
          [b, id],
        )
      ).rows[0];
      if (!cost) throw new NotFoundException();
      const rows = (
        await ctx.tx.query(
          'SELECT id,amount_minor::text AS "amountMinor",reference,paid_on::text AS "paidOn" FROM operational_cost_payments WHERE business_id=$1 AND cost_id=$2 ORDER BY created_at DESC,id LIMIT 26 OFFSET $3',
          [b, id, offset],
        )
      ).rows;
      return { cost, payments: rows.slice(0, 25), hasMore: rows.length > 25 };
    });
  }
  pay(actor: Actor, b: string, id: string, input: CostPayment) {
    return this.run(actor, b, (ctx) =>
      idempotent(ctx, 'operations.pay', input.idempotencyKey, { id, ...input }, async () => {
        const cost = (
          await ctx.tx.query(
            `SELECT ${costProjection} FROM operational_costs c WHERE c.business_id=$1 AND c.id=$2`,
            [b, id],
          )
        ).rows[0];
        if (!cost) throw new NotFoundException();
        if (BigInt(input.amountMinor) > BigInt(cost.amountMinor) - BigInt(cost.paidMinor))
          throw new ConflictException('Payment exceeds outstanding amount.');
        const paymentId = randomUUID();
        await ctx.tx.query(
          `INSERT INTO operational_cost_payments(id,business_id,cost_id,amount_minor,reference,paid_on,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [paymentId, b, id, input.amountMinor, input.reference, input.paidOn, actor.accountId],
        );
        await audit(ctx, id, 'operations.payment.recorded', null, {
          id,
          storeId: cost.storeId,
          paymentId,
        });
        return { id: paymentId };
      }),
    );
  }
}
