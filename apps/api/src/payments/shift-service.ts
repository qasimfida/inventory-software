import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hasPermission } from '@inventory/contracts';
import type { ShiftOpen, ShiftClose, ShiftQuery, CashAdjustment } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
import { idempotent } from '../database/idempotency.js';
import { ShiftCore, expectedCash } from './shift-core.js';
@Injectable()
export class ShiftService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
    @Inject(ShiftCore) private readonly core: ShiftCore,
  ) {}
  list(actor: Actor, b: string, q: ShiftQuery) {
    return this.scope.run(actor, b, 'payments.read', async (ctx) => {
      await this.locations.warehouse(ctx, q.warehouseId);
      const projection = `SELECT s.id,s.warehouse_id AS "warehouseId",s.terminal_id AS "terminalId",s.actor_id AS "actorId",
        CASE WHEN $6::boolean OR s.actor_id=$4 THEN a.email ELSE NULL END AS "actorName",
        t.name AS "terminalName",st.name AS "storeName",
        ($7::boolean AND s.state='open' AND ($3::boolean OR s.actor_id=$4)) AS "canClose",
        s.currency,s.opening_minor::text AS "openingMinor",s.state,(${expectedCash})::text AS "expectedMinor",
        s.counted_minor::text AS "countedMinor",(s.counted_minor-s.expected_minor)::text AS "discrepancyMinor",
        s.opened_at::text AS "openedAt",s.closed_at::text AS "closedAt"
        FROM cash_shifts s JOIN terminals t ON t.business_id=s.business_id AND t.id=s.terminal_id
        JOIN warehouses w ON w.business_id=s.business_id AND w.id=s.warehouse_id
        JOIN stores st ON st.business_id=w.business_id AND st.id=w.store_id
        JOIN auth_accounts a ON a.id=s.actor_id
        WHERE s.business_id=$1 AND s.warehouse_id=$2 AND ($3::boolean OR s.actor_id=$4)`;
      const args = [
        b,
        q.warehouseId,
        hasPermission(ctx.business, 'payments.cash'),
        actor.accountId,
        q.offset,
        hasPermission(ctx.business, 'users.read'),
        hasPermission(ctx.business, 'payments.write'),
      ];
      const rows = (
        await ctx.tx.query(
          `${projection}
        AND ($8::text IS NULL OR s.state=$8)
        AND ($9::uuid IS NULL OR s.terminal_id=$9)
        AND ($10::uuid IS NULL OR s.actor_id=$10)
        AND ($11::date IS NULL OR (s.opened_at AT TIME ZONE $14)::date >= $11)
        AND ($12::date IS NULL OR (s.opened_at AT TIME ZONE $14)::date <= $12)
        AND ($13::text IS NULL OR position(lower($13) in lower(concat_ws(' ',s.id::text,s.actor_id::text,t.name,t.code,st.name,st.code,s.state,
          CASE WHEN $6::boolean OR s.actor_id=$4 THEN a.email ELSE '' END)))>0)
        ORDER BY s.opened_at DESC,s.id LIMIT 26 OFFSET $5`,
          [
            ...args,
            q.state ?? null,
            q.terminalId ?? null,
            q.actorId ?? null,
            q.from ?? null,
            q.to ?? null,
            q.search || null,
            ctx.business.timeZone ?? 'UTC',
          ],
        )
      ).rows;
      const activeShifts = (
        await ctx.tx.query(
          `${projection} AND s.actor_id=$4 AND s.state='open'
        ORDER BY s.opened_at DESC,s.id LIMIT 25 OFFSET $5`,
          [...args.slice(0, 4), 0, ...args.slice(5)],
        )
      ).rows;
      const staff = (
        await ctx.tx.query<{ id: string; label: string }>(
          `SELECT DISTINCT s.actor_id AS id, CASE WHEN $5::boolean OR s.actor_id=$4 THEN a.email ELSE s.actor_id::text END AS label
         FROM cash_shifts s JOIN auth_accounts a ON a.id=s.actor_id WHERE s.business_id=$1 AND s.warehouse_id=$2 AND ($3::boolean OR s.actor_id=$4) ORDER BY label,id LIMIT 100`,
          [b, q.warehouseId, args[2], actor.accountId, args[5]],
        )
      ).rows;
      return {
        staff,
        shifts: rows.slice(0, 25),
        activeShifts,
        hasMore: rows.length > 25,
        offset: q.offset,
      };
    });
  }
  open(actor: Actor, b: string, input: ShiftOpen) {
    return this.scope.run(actor, b, 'payments.write', async (ctx) => {
      const wh = await this.locations.warehouse(ctx, input.warehouseId);
      return idempotent(ctx, 'shift.open', input.idempotencyKey, input, async () => {
        const terminal = (
          await ctx.tx.query(
            `SELECT id FROM terminals WHERE business_id=$1 AND id=$2 AND store_id=$3 AND warehouse_id=$4 AND state='active'`,
            [b, input.terminalId, wh.storeId, wh.id],
          )
        ).rows[0];
        if (!terminal || wh.state !== 'active') throw new ConflictException();
        const id = randomUUID();
        await ctx.tx.query(
          'INSERT INTO cash_shifts(id,business_id,warehouse_id,terminal_id,actor_id,currency,opening_minor) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [id, b, wh.id, input.terminalId, actor.accountId, input.currency, input.openingMinor],
        );
        await audit(ctx, id, 'shift.opened', null, {
          shiftId: id,
          warehouseId: wh.id,
          storeId: wh.storeId,
          amount: input.openingMinor,
          currency: input.currency,
        });
        return { id };
      });
    });
  }
  close(actor: Actor, b: string, id: string, input: ShiftClose) {
    return this.scope.run(actor, b, 'payments.write', async (ctx) => {
      const shift = await this.core.get(ctx, id);
      if (shift.actorId !== actor.accountId && !hasPermission(ctx.business, 'payments.cash'))
        throw new ForbiddenException();
      return idempotent(ctx, 'shift.close', input.idempotencyKey, { ...input, id }, async () => {
        if (shift.state !== 'open') throw new ConflictException();
        await ctx.tx.query(
          `UPDATE cash_shifts SET state='closed',expected_minor=$3,counted_minor=$4,closed_by=$5,closed_at=now() WHERE business_id=$1 AND id=$2`,
          [b, id, shift.expectedMinor, input.countedMinor, actor.accountId],
        );
        await audit(ctx, id, 'shift.closed', null, {
          shiftId: id,
          warehouseId: shift.warehouseId,
          storeId: shift.storeId,
          amount: input.countedMinor,
        });
        return {
          id,
          expectedMinor: shift.expectedMinor,
          discrepancyMinor: (BigInt(input.countedMinor) - BigInt(shift.expectedMinor)).toString(),
        };
      });
    });
  }
  adjust(actor: Actor, b: string, id: string, input: CashAdjustment) {
    return this.scope.run(actor, b, 'payments.cash', async (ctx) => {
      await this.core.get(ctx, id);
      return idempotent(ctx, 'shift.adjust', input.idempotencyKey, { ...input, id }, async () => {
        const entryId = randomUUID();
        await this.core.entry(
          ctx,
          id,
          BigInt(input.amountMinor) * (input.kind === 'cash_in' ? 1n : -1n),
          input.kind,
          entryId,
          input.reference,
        );
        const shift = await this.core.get(ctx, id);
        await audit(ctx, id, `shift.${input.kind}`, null, {
          shiftId: id,
          warehouseId: shift.warehouseId,
          storeId: shift.storeId,
          amount: input.amountMinor,
        });
        return { id: entryId };
      });
    });
  }
}
