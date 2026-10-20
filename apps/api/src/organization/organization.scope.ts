import { safeAuditData } from './audit-data.js';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Business, Permission } from '@inventory/contracts';
import { DatabaseService } from '../database/database.service.js';
import type { Transaction } from '../database/transaction.js';
import { businessAccessJoin, businessAccessProjection, requirePermission } from './access.js';
export interface Actor {
  accountId: string;
  requestId: string;
}
export interface OrganizationContext {
  business: Business;
  actor: Actor;
  tx: Transaction;
}
@Injectable()
export class OrganizationScope {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async run<T>(
    actor: Actor,
    businessId: string,
    permission: Permission,
    work: (context: OrganizationContext) => Promise<T>,
  ) {
    return this.database.transaction(async (tx) => {
      // Serialize business access before obtaining a fresh membership/administrator snapshot.
      const locked = await tx.query(
        `SELECT b.id FROM businesses b WHERE b.id=$1 AND (
          EXISTS(SELECT 1 FROM business_memberships m WHERE m.business_id=b.id AND m.account_id=$2 AND m.state='active')
          OR EXISTS(SELECT 1 FROM platform_administrators WHERE account_id=$2)) FOR UPDATE OF b`,
        [businessId, actor.accountId],
      );
      if (!locked.rowCount) throw new NotFoundException();
      const result = await tx.query<Business>(
        `SELECT ${businessAccessProjection} FROM businesses b ${businessAccessJoin}
         WHERE b.id=$1 AND (m.account_id IS NOT NULL OR p.account_id IS NOT NULL)`,
        [businessId, actor.accountId],
      );
      const business = result.rows[0];
      if (!business) throw new NotFoundException();
      requirePermission(business, permission);
      if (business.state !== 'active' && !['business.write', 'audit.read'].includes(permission))
        throw new ForbiddenException();
      if (business.scope?.storeId) {
        const active = await tx.query(
          `SELECT 1 FROM stores s WHERE s.business_id=$1 AND s.id=$2 AND s.state='active'
          AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM warehouses w WHERE w.business_id=$1 AND w.store_id=s.id AND w.id=$3 AND w.state='active'))`,
          [business.id, business.scope.storeId, business.scope.warehouseId],
        );
        if (!active.rowCount) throw new ForbiddenException();
      }
      try {
        return await work({ business, actor, tx });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          ['23505', '23503', '23514'].includes(String(error.code))
        )
          throw new ConflictException();
        throw error;
      }
    });
  }
}
export function checkVersionAndState(current: { version: number; state: string }, version: number) {
  if (current.version !== version || current.state === 'archived') throw new ConflictException();
}
export async function audit(
  context: OrganizationContext,
  resourceId: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await context.tx.query(
    `INSERT INTO organization_audit(business_id,actor_id,resource_id,action,request_id,before_data,after_data,store_id,warehouse_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      context.business.id,
      context.actor.accountId,
      resourceId,
      action,
      context.actor.requestId,
      JSON.stringify(safeAuditData(before)),
      JSON.stringify(safeAuditData(after)),
      auditScope(after, 'storeId', resourceId),
      auditScope(after, 'warehouseId', resourceId),
    ],
  );
}

function auditScope(data: unknown, field: 'storeId' | 'warehouseId', id: string) {
  if (!data || typeof data !== 'object') return null;
  if (
    'kind' in data &&
    ((data.kind === 'stores' && field === 'storeId') ||
      (data.kind === 'warehouses' && field === 'warehouseId'))
  )
    return id;
  return field in data ? (data as Record<string, unknown>)[field] : null;
}
