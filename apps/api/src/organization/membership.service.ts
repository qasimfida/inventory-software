import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validAssignment } from '@inventory/contracts';
import { requireActiveParents } from './location.repository.js';
import type { AssignMember, EditMember, Membership } from '@inventory/contracts';
import { OrganizationScope, audit, checkVersionAndState } from './organization.scope.js';
import type { Actor } from './organization.scope.js';
@Injectable()
export class MembershipService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  assign(actor: Actor, businessId: string, input: AssignMember) {
    return this.scope.run(actor, businessId, 'users.write', async (context) => {
      if (!validAssignment(input)) throw new BadRequestException();
      if (input.scope.storeId)
        await requireActiveParents(context, input.scope.storeId, input.scope.warehouseId);
      const account = (
        await context.tx.query<{ id: string }>(
          "SELECT id FROM auth_accounts WHERE email=$1 AND status='active'",
          [input.email],
        )
      ).rows[0];
      if (!account) throw new NotFoundException();
      await context.tx.query(
        'INSERT INTO business_memberships(business_id,account_id,role,scope_store_id,scope_warehouse_id,permissions) VALUES($1,$2,$3,$4,$5,$6)',
        [
          businessId,
          account.id,
          input.role,
          input.scope.storeId,
          input.scope.warehouseId,
          input.permissions,
        ],
      );
      await audit(context, account.id, 'membership.assigned', null, {
        role: input.role,
        scope: input.scope,
        permissions: input.permissions,
        state: 'active',
      });
      return {
        accountId: account.id,
        email: input.email,
        role: input.role,
        scope: input.scope,
        permissions: input.permissions,
        state: 'active' as const,
        version: 1,
      };
    });
  }
  edit(actor: Actor, businessId: string, accountId: string, input: EditMember) {
    return this.scope.run(actor, businessId, 'users.write', async (context) => {
      if (!validAssignment(input)) throw new BadRequestException();
      if (input.scope.storeId)
        await requireActiveParents(context, input.scope.storeId, input.scope.warehouseId);
      const current = (
        await context.tx.query<Omit<Membership, 'email'>>(
          `SELECT account_id AS "accountId",role,state,version,permissions,json_build_object('storeId',scope_store_id,'warehouseId',scope_warehouse_id) AS scope FROM business_memberships WHERE business_id=$1 AND account_id=$2`,
          [businessId, accountId],
        )
      ).rows[0];
      if (!current) throw new NotFoundException();
      checkVersionAndState(current, input.version);
      if (input.role !== 'owner' || input.state !== 'active') {
        const remaining = await context.tx.query(
          `SELECT m.account_id FROM business_memberships m JOIN auth_accounts a ON a.id=m.account_id
          WHERE m.business_id=$1 AND m.account_id<>$2 AND m.role='owner' AND m.state='active' AND a.status='active'`,
          [businessId, accountId],
        );
        if (!remaining.rowCount) throw new ConflictException();
      }
      await context.tx.query(
        'UPDATE business_memberships SET role=$1,state=$2,version=version+1,scope_store_id=$5,scope_warehouse_id=$6,permissions=$7 WHERE business_id=$3 AND account_id=$4',
        [
          input.role,
          input.state,
          businessId,
          accountId,
          input.scope.storeId,
          input.scope.warehouseId,
          input.permissions,
        ],
      );
      await audit(context, accountId, 'membership.updated', current, {
        ...input,
        version: input.version + 1,
      });
      return { ok: true };
    });
  }
}
