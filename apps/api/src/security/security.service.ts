import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { requirePlatformAdmin } from '../settings/settings-store.js';
import { eventProjection, notificationProjection, recipientAccess } from './security-queries.js';
import { securityEvent } from './events.js';
@Injectable()
export class SecurityService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
  ) {}
  async events(actor: Actor, cursor?: string, platform = false) {
    return this.db.transaction(async (tx) => {
      if (platform) await requirePlatformAdmin(tx, actor.accountId);
      const events = (
        await tx.query<{ id: string }>(
          `SELECT ${eventProjection} FROM security_events e
        WHERE ($1::boolean OR e.actor_id=$2) AND ($3::bigint IS NULL OR e.id<$3)
        ORDER BY e.id DESC LIMIT 50`,
          [platform, actor.accountId, cursor ?? null],
        )
      ).rows;
      return { events, nextCursor: events.length === 50 ? events.at(-1)!.id : null };
    });
  }
  business(actor: Actor, id: string, cursor?: string) {
    return this.scope.run(actor, id, 'users.write', async (ctx) => {
      const events = (
        await ctx.tx.query<{ id: string }>(
          `SELECT ${eventProjection} FROM security_events e
        WHERE e.business_id=$1 AND ($2::bigint IS NULL OR e.id<$2) ORDER BY e.id DESC LIMIT 50`,
          [id, cursor ?? null],
        )
      ).rows;
      return { events, nextCursor: events.length === 50 ? events.at(-1)!.id : null };
    });
  }
  async inbox(actor: Actor, cursor?: string) {
    const notifications = (
      await this.db.query<{ id: string; position: string }>(
        `SELECT d.position::text,${notificationProjection} FROM security_deliveries d
      JOIN security_events e ON e.id=d.event_id JOIN security_inbox i ON i.delivery_id=d.id
      WHERE ${recipientAccess} AND ($2::bigint IS NULL OR d.position<$2) ORDER BY d.position DESC LIMIT 50`,
        [actor.accountId, cursor ?? null],
      )
    ).rows;
    return {
      notifications: notifications.map((row) => {
        const { position, ...notification } = row;
        void position;
        return notification;
      }),
      nextCursor: notifications.length === 50 ? notifications.at(-1)!.position : null,
    };
  }
  async read(actor: Actor, id: string) {
    const result = await this.db.query(
      `UPDATE security_inbox i SET read_at=COALESCE(read_at,now())
      FROM security_deliveries d JOIN security_events e ON e.id=d.event_id
      WHERE i.delivery_id=d.id AND d.id=$2 AND ${recipientAccess} RETURNING i.delivery_id`,
      [actor.accountId, id],
    );
    if (!result.rowCount) throw new NotFoundException();
    return { ok: true };
  }
  deliveries(actor: Actor) {
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, actor.accountId);
      return {
        deliveries: (
          await tx.query(`SELECT id,event_id::text AS "eventId",recipient_id AS "recipientId",business_id AS "businessId",
        state,attempts,failure_code AS "failureCode",next_attempt_at AS "nextAttemptAt" FROM security_deliveries
        WHERE state<>'delivered' ORDER BY next_attempt_at LIMIT 50`)
        ).rows,
      };
    });
  }
  retry(actor: Actor, id: string) {
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, actor.accountId);
      const result = await tx.query(
        `UPDATE security_deliveries SET state='pending',attempts=0,next_attempt_at=now(),failure_code=NULL
        WHERE id=$1 AND state='failed' RETURNING id`,
        [id],
      );
      if (!result.rowCount) throw new NotFoundException();
      await securityEvent(tx, {
        event: 'notifications.retry',
        actorId: actor.accountId,
        requestId: actor.requestId,
      });
      return { ok: true };
    });
  }
  diagnostics(actor: Actor) {
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, actor.accountId);
      return {
        diagnostics: (
          await tx.query(`SELECT id,occurred_at AS "occurredAt",request_id AS "requestId",environment,
        application_version AS "applicationVersion",code,category,operation,severity,retryable,actor_id AS "actorId",reason,recovery
        FROM diagnostic_events ORDER BY occurred_at DESC LIMIT 50`)
        ).rows,
      };
    });
  }
}
