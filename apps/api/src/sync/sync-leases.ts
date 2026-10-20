import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { offlinePolicySchema, hasPermission } from '@inventory/contracts';
import type { OfflinePolicy } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { ShiftCore } from '../payments/shift-core.js';
import { SyncCatalog } from './sync-catalog.js';
import { accessHash } from './sync-cursor.js';
@Injectable()
export class SyncLeases {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(ShiftCore) private readonly shifts: ShiftCore,
    @Inject(SyncCatalog) private readonly catalog: SyncCatalog,
  ) {}
  identity(actor: Actor, b: string) {
    return this.scope.run(actor, b, 'business.read', async (ctx) => ({
      actorId: ctx.actor.accountId,
    }));
  }
  policy(actor: Actor, b: string) {
    return this.scope.run(actor, b, 'business.read', async (ctx) =>
      offlinePolicySchema.parse(
        (await ctx.tx.query('SELECT policy FROM offline_policies WHERE business_id=$1', [b]))
          .rows[0]?.policy ?? {},
      ),
    );
  }
  save(actor: Actor, b: string, input: OfflinePolicy) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      const current =
        (
          await ctx.tx.query<{ version: number }>(
            'SELECT version FROM offline_policies WHERE business_id=$1',
            [b],
          )
        ).rows[0]?.version ?? 1;
      if (current !== input.version) throw new ConflictException();
      const policy = { ...input, version: current + 1 };
      await ctx.tx.query(
        'INSERT INTO offline_policies(business_id,policy,version) VALUES($1,$2,$3) ON CONFLICT(business_id) DO UPDATE SET policy=excluded.policy,version=excluded.version',
        [b, policy, policy.version],
      );
      await audit(ctx, b, 'offline.policy', null, { version: policy.version });
      return policy;
    });
  }
  prepare(
    actor: Actor,
    b: string,
    input: { warehouseId: string; currency: string; deviceId: string },
  ) {
    return this.scope.run(actor, b, 'sales.write', async (ctx) => {
      if (!hasPermission(ctx.business, 'payments.write')) throw new ForbiddenException();
      const policy = offlinePolicySchema.parse(
        (await ctx.tx.query('SELECT policy FROM offline_policies WHERE business_id=$1', [b]))
          .rows[0]?.policy ?? {},
      );
      if (!policy.enabled) throw new ConflictException();
      if (!hasPermission(ctx.business, 'products.write')) policy.maxDiscountBasisPoints = 0;
      const shiftId = await this.shifts.active(ctx, input.warehouseId, input.currency),
        snapshot = await this.catalog.snapshot(ctx, input.warehouseId, input.currency),
        id = randomUUID(),
        createdAt = new Date().toISOString(),
        expiresAt = new Date(Date.now() + policy.leaseMinutes * 60000).toISOString();
      await ctx.tx.query(
        'INSERT INTO offline_leases(id,business_id,actor_id,warehouse_id,shift_id,device_id,currency,access_hash,policy,snapshot,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [
          id,
          b,
          actor.accountId,
          input.warehouseId,
          shiftId,
          input.deviceId,
          input.currency,
          accessHash(ctx),
          policy,
          snapshot,
          expiresAt,
        ],
      );
      await audit(ctx, id, 'offline.lease', null, {
        warehouseId: input.warehouseId,
        storeId: snapshot.storeId,
        shiftId,
      });
      return {
        id,
        businessId: b,
        actorId: actor.accountId,
        deviceId: input.deviceId,
        warehouseId: input.warehouseId,
        shiftId,
        currency: input.currency,
        createdAt,
        expiresAt,
        policy,
        snapshot,
      };
    });
  }
}
