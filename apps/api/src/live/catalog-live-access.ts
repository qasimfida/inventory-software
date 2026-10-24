import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
export interface LiveIdentity {
  sessionId: string;
  businessId: string;
  actor: Actor;
}
const digest = (ticket: string) => createHash('sha256').update(ticket).digest('hex');
@Injectable()
export class CatalogLiveAccess {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
  ) {}
  async issue(identity: LiveIdentity) {
    await this.head(identity);
    const ticket = randomBytes(32).toString('base64url');
    await this.db.transaction(async (tx) => {
      await tx.query('DELETE FROM live_catalog_tickets WHERE expires_at < now()');
      await tx.query(
        "INSERT INTO live_catalog_tickets VALUES($1,$2,$3,now()+interval '30 seconds')",
        [digest(ticket), identity.sessionId, identity.businessId],
      );
    });
    return { ticket };
  }
  async consume(ticket: string): Promise<LiveIdentity> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw new UnauthorizedException();
    const result = await this.db.query<{
      session_id: string;
      business_id: string;
      account_id: string;
    }>(
      `WITH used AS (DELETE FROM live_catalog_tickets WHERE token_hash=$1 AND expires_at>now() RETURNING *)
       SELECT used.*,s.account_id FROM used JOIN auth_sessions s ON s.id=used.session_id`,
      [digest(ticket)],
    );
    const row = result.rows[0];
    if (!row) throw new UnauthorizedException();
    return {
      sessionId: row.session_id,
      businessId: row.business_id,
      actor: { accountId: row.account_id, requestId: 'catalog-live' },
    };
  }
  async head(identity: LiveIdentity) {
    const active = await this.db.query(
      `SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.account_id
      WHERE s.id=$1 AND s.account_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now()
      AND s.absolute_expires_at>now() AND a.status='active'`,
      [identity.sessionId, identity.actor.accountId],
    );
    if (!active.rowCount) throw new UnauthorizedException();
    return this.scope.run(identity.actor, identity.businessId, 'products.read', async (ctx) => {
      const result = await ctx.tx.query<{ revision: string }>(
        `SELECT COALESCE(max(revision),0)::text AS revision FROM sync_changes
        WHERE business_id=$1 AND ($2::uuid IS NULL OR store_id IS NULL OR store_id=$2)
        AND ($3::uuid IS NULL OR warehouse_id IS NULL OR warehouse_id=$3)`,
        [
          identity.businessId,
          ctx.business.scope?.storeId ?? null,
          ctx.business.scope?.warehouseId ?? null,
        ],
      );
      return {
        type: 'catalog.changed' as const,
        revision: result.rows[0]!.revision,
        clock: Math.floor(Date.now() / 30000),
      };
    });
  }
}
