import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { hasPermission } from '@inventory/contracts';
import { businessAccessJoin, businessAccessProjection } from './access.js';
import { randomUUID } from 'node:crypto';
import type { Business, EditBusiness, Workspace } from '@inventory/contracts';
import { DatabaseService } from '../database/database.service.js';
import { OrganizationScope, audit, checkVersionAndState } from './organization.scope.js';
import type { Actor } from './organization.scope.js';
import { listLocations } from './location.repository.js';
@Injectable()
export class BusinessService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
  ) {}
  async list(actor: Actor) {
    return {
      businesses: (
        await this.database.query<Business>(
          `SELECT ${businessAccessProjection} FROM businesses b ${businessAccessJoin}
          WHERE ($1::uuid IS NULL) AND (m.account_id IS NOT NULL OR p.account_id IS NOT NULL) ORDER BY b.name,b.id`,
          [null, actor.accountId],
        )
      ).rows,
    };
  }
  async create(actor: Actor, name: string, timeZone = 'UTC') {
    return this.database.transaction(async (tx) => {
      const account = await tx.query(
        "SELECT id FROM auth_accounts WHERE id=$1 AND status='active' FOR UPDATE",
        [actor.accountId],
      );
      if (!account.rowCount) throw new ForbiddenException();
      const id = randomUUID();
      const business: Business = { id, name, state: 'active', version: 1, role: 'owner', timeZone };
      await tx.query('INSERT INTO businesses(id,name,time_zone) VALUES($1,$2,$3)', [
        id,
        name,
        timeZone,
      ]);
      await tx.query(
        "INSERT INTO business_memberships(business_id,account_id,role) VALUES($1,$2,'owner')",
        [id, actor.accountId],
      );
      await audit({ tx, actor, business }, id, 'business.created', null, {
        name,
        state: 'active',
        ownerId: actor.accountId,
      });
      return business;
    });
  }
  async edit(actor: Actor, id: string, input: EditBusiness) {
    return this.scope.run(actor, id, 'business.write', async (context) => {
      checkVersionAndState(context.business, input.version);
      await context.tx.query(
        'UPDATE businesses SET name=$1,state=$2,version=version+1,time_zone=$4 WHERE id=$3',
        [input.name, input.state, id, input.timeZone],
      );
      await audit(context, id, 'business.updated', context.business, {
        ...input,
        version: input.version + 1,
      });
      return { ...context.business, ...input, version: input.version + 1 };
    });
  }
  async workspace(actor: Actor, id: string): Promise<Workspace> {
    return this.scope.run(actor, id, 'business.read', async (context) => ({
      business: context.business,
      locations: hasPermission(context.business, 'locations.read')
        ? await listLocations(context)
        : [],
      members: hasPermission(context.business, 'users.read')
        ? (
            await context.tx.query<Workspace['members'][number]>(
              `SELECT m.account_id AS "accountId",a.email,m.role,m.state,m.version,m.permissions,json_build_object('storeId',m.scope_store_id,'warehouseId',m.scope_warehouse_id) AS scope
        FROM business_memberships m JOIN auth_accounts a ON a.id=m.account_id WHERE m.business_id=$1 ORDER BY a.email,m.account_id`,
              [id],
            )
          ).rows
        : [],
    }));
  }
  async events(actor: Actor, id: string, cursor?: string) {
    return this.scope.run(actor, id, 'audit.read', async (context) => {
      const result = await context.tx.query(
        `SELECT id::text,actor_id AS "actorId",resource_id AS "resourceId",action,
        store_id AS "storeId",warehouse_id AS "warehouseId",request_id AS "requestId",occurred_at AS "occurredAt",before_data AS before,after_data AS after FROM organization_audit
        WHERE business_id=$1 AND ($2::bigint IS NULL OR id<$2::bigint) AND ($3::uuid IS NULL OR store_id=$3) AND ($4::uuid IS NULL OR warehouse_id=$4) ORDER BY id DESC LIMIT 51`,
        [
          id,
          cursor ?? null,
          context.business.scope?.storeId ?? null,
          context.business.scope?.warehouseId ?? null,
        ],
      );
      const rows = result.rows.slice(0, 50);
      return {
        events: rows.map((row) => ({ ...row, occurredAt: (row.occurredAt as Date).toISOString() })),
        nextCursor: result.rows.length > 50 ? String(rows.at(-1)!.id) : null,
      };
    });
  }
}
