import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
export const expectedCash = `s.opening_minor+COALESCE((SELECT sum(e.amount_minor) FROM cash_entries e WHERE e.business_id=s.business_id AND e.shift_id=s.id),0)`;
@Injectable()
export class ShiftCore {
  constructor(@Inject(LocationAccess) private readonly locations: LocationAccess) {}
  async get(ctx: OrganizationContext, id: string) {
    const row = (
      await ctx.tx.query<{
        id: string;
        actorId: string;
        warehouseId: string;
        currency: string;
        state: string;
        expectedMinor: string;
      }>(
        `SELECT s.id,s.actor_id AS "actorId",s.warehouse_id AS "warehouseId",s.currency,s.state,(${expectedCash})::text AS "expectedMinor" FROM cash_shifts s WHERE s.business_id=$1 AND s.id=$2`,
        [ctx.business.id, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    const warehouse = await this.locations.warehouse(ctx, row.warehouseId);
    return { ...row, storeId: warehouse.storeId };
  }
  async active(ctx: OrganizationContext, warehouseId: string, currency: string) {
    const wh = await this.locations.warehouse(ctx, warehouseId);
    if (wh.state !== 'active') throw new ConflictException();
    const row = (
      await ctx.tx.query<{ id: string }>(
        `SELECT id FROM cash_shifts WHERE business_id=$1 AND actor_id=$2 AND warehouse_id=$3 AND currency=$4 AND state='open' AND EXISTS(SELECT 1 FROM terminals t WHERE t.business_id=cash_shifts.business_id AND t.id=cash_shifts.terminal_id AND t.warehouse_id=cash_shifts.warehouse_id AND t.state='active')`,
        [ctx.business.id, ctx.actor.accountId, warehouseId, currency],
      )
    ).rows[0];
    if (!row)
      throw new ConflictException('Open a cash shift for this warehouse and currency first.');
    return row.id;
  }
  async entry(
    ctx: OrganizationContext,
    shiftId: string,
    amount: bigint,
    kind: string,
    sourceId: string,
    reference: string,
  ) {
    const shift = await this.get(ctx, shiftId);
    const next = BigInt(shift.expectedMinor) + amount;
    if (shift.state !== 'open' || next < 0n || next > 999999999999999999999999n)
      throw new ConflictException('Insufficient cash or closed shift.');
    await ctx.tx.query(
      'INSERT INTO cash_entries(id,business_id,shift_id,amount_minor,kind,source_id,reference,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        randomUUID(),
        ctx.business.id,
        shiftId,
        amount.toString(),
        kind,
        sourceId,
        reference,
        ctx.actor.accountId,
      ],
    );
  }
}
