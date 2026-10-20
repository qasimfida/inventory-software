import { canonicalJson } from '@inventory/domain';
import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { OrganizationContext } from '../organization/organization.scope.js';
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
// Call only within the authorized, business-locked transaction. Never cache before authorization.
export async function idempotent<T>(
  context: OrganizationContext,
  operation: string,
  key: string,
  input: unknown,
  work: () => Promise<T>,
): Promise<T> {
  const args = [context.business.id, context.actor.accountId, operation, key];
  const requestHash = hash(input),
    accessHash = hash({
      role: context.business.role,
      scope: context.business.scope,
      permissions: context.business.permissions,
    });
  const existing = (
    await context.tx.query<{ request_hash: string; access_hash: string; response: T }>(
      'SELECT request_hash,access_hash,response FROM operation_receipts WHERE business_id=$1 AND actor_id=$2 AND operation=$3 AND idempotency_key=$4',
      args,
    )
  ).rows[0];
  if (existing) {
    if (existing.request_hash !== requestHash || existing.access_hash !== accessHash)
      throw new ConflictException();
    return existing.response;
  }
  const response = await work();
  await context.tx.query(
    'INSERT INTO operation_receipts(business_id,actor_id,operation,idempotency_key,request_hash,access_hash,response) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [...args, requestHash, accessHash, JSON.stringify(response)],
  );
  return response;
}
