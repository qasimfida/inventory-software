import { ConflictException, ForbiddenException } from '@nestjs/common';
import { safePolicy, safePreferences } from '@inventory/contracts';
import type { Transaction } from '../database/transaction.js';
export const PLATFORM_SCOPE = '00000000-0000-0000-0000-000000000000';
export async function platformAdmin(tx: Transaction, accountId: string) {
  return !!(
    await tx.query(
      `SELECT 1 FROM platform_administrators p JOIN auth_accounts a ON a.id=p.account_id
    WHERE p.account_id=$1 AND a.status='active' FOR SHARE OF p,a`,
      [accountId],
    )
  ).rowCount;
}
export async function requirePlatformAdmin(tx: Transaction, accountId: string) {
  if (!(await platformAdmin(tx, accountId))) throw new ForbiddenException();
}
export async function readPolicy(tx: Transaction, scopeId = PLATFORM_SCOPE) {
  const row = (
    await tx.query<{ version: number; data: unknown }>(
      'SELECT version,data FROM settings_policies WHERE scope_id=$1',
      [scopeId],
    )
  ).rows[0];
  return { version: row?.version ?? 0, values: safePolicy(row?.data) };
}
export async function readPreferences(tx: Transaction, accountId: string) {
  const row = (
    await tx.query<{ version: number; data: unknown }>(
      'SELECT version,data FROM user_preferences WHERE account_id=$1',
      [accountId],
    )
  ).rows[0];
  return { version: row?.version ?? 0, values: safePreferences(row?.data) };
}
export async function writePolicy(
  tx: Transaction,
  scopeId: string,
  version: number,
  values: unknown,
) {
  const result = await tx.query(
    `INSERT INTO settings_policies(scope_id,business_id,data)
    SELECT $1,$2,$3 WHERE $4=0 ON CONFLICT(scope_id) DO NOTHING RETURNING version`,
    [scopeId, scopeId === PLATFORM_SCOPE ? null : scopeId, JSON.stringify(values), version],
  );
  if (version === 0) {
    if (!result.rowCount) throw new ConflictException();
    return;
  }
  const updated = await tx.query(
    `UPDATE settings_policies SET data=$2,version=version+1,updated_at=now()
    WHERE scope_id=$1 AND version=$3 RETURNING version`,
    [scopeId, JSON.stringify(values), version],
  );
  if (!updated.rowCount) throw new ConflictException();
}
