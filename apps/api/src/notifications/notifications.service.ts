import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { rolePermissions } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { approvalQueue } from './approval-queue.js';
const access = `d.business_id=$1 AND d.recipient_id=$2 AND d.permission=ANY($3::text[])
 AND ($4::uuid IS NULL OR d.store_id=$4) AND ($5::uuid IS NULL OR d.warehouse_id=$5)`;
function args(ctx: OrganizationContext) {
  return [
    ctx.business.id,
    ctx.actor.accountId,
    rolePermissions(ctx.business.role, ctx.business.permissions),
    ctx.business.scope?.storeId ?? null,
    ctx.business.scope?.warehouseId ?? null,
  ];
}
@Injectable()
export class NotificationsService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  inbox(
    actor: Actor,
    b: string,
    cursor?: string,
    search = '',
    status: 'all' | 'read' | 'unread' = 'all',
  ) {
    return this.scope.run(actor, b, 'business.read', async (ctx) => {
      const rows = (
        await ctx.tx.query<{ position: string }>(
          `SELECT d.position::text,d.id,e.action AS event,e.resource_id AS "resourceId",
        CASE WHEN e.action='storefront.readiness_batch' THEN
        COALESCE(e.after_data->>'quantity','0')||' products moved to Changes required; '||COALESCE(e.after_data->>'amount','0')||' repaired. Review Online store. Reason: '||COALESCE(e.after_data->>'reasonCode','readiness_revalidated') ELSE NULL END AS summary,
        e.occurred_at AS "createdAt",d.read_at AS "readAt",d.warehouse_id AS "warehouseId"
        FROM business_deliveries d JOIN organization_audit e ON e.id=d.event_id
        WHERE ${access} AND d.state='delivered' AND ($6::bigint IS NULL OR d.position<$6)
        AND (replace(e.action,'.',' ') ILIKE $7 OR e.action ILIKE $7 OR e.resource_id::text ILIKE $7)
        AND ($8='all' OR ($8='read' AND d.read_at IS NOT NULL) OR ($8='unread' AND d.read_at IS NULL))
        ORDER BY d.position DESC LIMIT 50`,
          [...args(ctx), cursor ?? null, `%${search.replace(/[\\%_]/g, '\\$&')}%`, status],
        )
      ).rows;
      return {
        notifications: rows.map(({ position, ...row }) => {
          void position;
          return Object.fromEntries(
            Object.entries(row).filter(([key, value]) => key !== 'summary' || value !== null),
          );
        }),
        nextCursor: rows.length === 50 ? rows.at(-1)!.position : null,
      };
    });
  }
  read(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'business.read', async (ctx) => {
      const result = await ctx.tx.query(
        `UPDATE business_deliveries d SET read_at=COALESCE(read_at,now())
        WHERE ${access} AND d.id=$6 AND d.state='delivered' RETURNING id`,
        [...args(ctx), id],
      );
      if (!result.rowCount) throw new NotFoundException();
      return { ok: true };
    });
  }
  approvals(actor: Actor, b: string, offset: number) {
    return this.scope.run(actor, b, 'business.read', (ctx) => approvalQueue(ctx, offset));
  }
  failures(actor: Actor, b: string) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => ({
      deliveries: (
        await ctx.tx.query(
          `SELECT d.id,e.action AS event,d.state,d.attempts,d.failure_code AS "failureCode" FROM business_deliveries d
      JOIN organization_audit e ON e.id=d.event_id WHERE d.business_id=$1 AND d.state<>'delivered' ORDER BY d.position LIMIT 50`,
          [ctx.business.id],
        )
      ).rows,
    }));
  }
  retry(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      const result = await ctx.tx.query(
        `UPDATE business_deliveries SET state='pending',attempts=0,next_attempt_at=now(),failure_code=NULL
        WHERE business_id=$1 AND id=$2 AND state='failed' RETURNING id`,
        [b, id],
      );
      if (!result.rowCount) throw new NotFoundException();
      await audit(ctx, id, 'notification.retry', null, { id });
      return { ok: true };
    });
  }
}
