import { securityEvent } from '../security/events.js';
import { UnauthorizedException } from '@nestjs/common';
import type { DatabaseService } from '../database/database.service.js';
import { hashPassword, newToken, tokenHash } from './secrets.js';
import { revokeOfflineAccess } from '../sync/revoke-offline-access.js';

// Operator-only issuance; never expose this function as an unauthenticated HTTP route.
export async function issueRecovery(database: DatabaseService, email: string) {
  return database.transaction(async (tx) => {
    const account = (
      await tx.query<{ id: string }>(
        "SELECT id FROM auth_accounts WHERE email=$1 AND status='active' FOR NO KEY UPDATE",
        [email],
      )
    ).rows[0];
    if (!account) throw new UnauthorizedException();
    await tx.query(
      'UPDATE auth_password_resets SET consumed_at=now() WHERE account_id=$1 AND consumed_at IS NULL',
      [account.id],
    );
    const token = newToken();
    await tx.query(
      "INSERT INTO auth_password_resets(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
      [tokenHash(token), account.id],
    );
    await securityEvent(tx, { event: 'password.recovery_issued', actorId: account.id });
    return token;
  });
}

export async function completeRecovery(
  database: DatabaseService,
  input: { email: string; password: string; resetToken: string },
  requestId?: string,
) {
  // Equal hash cost for invalid codes/accounts. Rate limits run before this function.
  const passwordHash = await hashPassword(input.password);
  await database.transaction(async (tx) => {
    // Same account-first lock order as login, issuance and logout-all.
    const account = (
      await tx.query<{ id: string }>(
        "SELECT id FROM auth_accounts WHERE email=$1 AND status='active' FOR NO KEY UPDATE",
        [input.email],
      )
    ).rows[0];
    if (!account) throw new UnauthorizedException();
    const consumed = await tx.query(
      `UPDATE auth_password_resets SET consumed_at=now()
       WHERE account_id=$1 AND token_hash=$2 AND consumed_at IS NULL AND expires_at>now()
       RETURNING account_id`,
      [account.id, tokenHash(input.resetToken)],
    );
    if (!consumed.rowCount) throw new UnauthorizedException();
    await tx.query('UPDATE auth_accounts SET password_hash=$2 WHERE id=$1', [
      account.id,
      passwordHash,
    ]);
    await tx.query(
      'UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',
      [account.id],
    );
    await tx.query(
      'UPDATE auth_password_resets SET consumed_at=now() WHERE account_id=$1 AND consumed_at IS NULL',
      [account.id],
    );
    await revokeOfflineAccess(tx, account.id);
    await securityEvent(tx, {
      event: 'password.reset',
      actorId: account.id,
      ...(requestId ? { requestId } : {}),
    });
  });
}

// Read-only preflight. Completion still revalidates and consumes inside its transaction.
export async function inspectRecovery(
  database: DatabaseService,
  input: { email: string; resetToken: string },
) {
  const result = await database.query<{ expires_at: Date }>(
    `SELECT r.expires_at FROM auth_password_resets r JOIN auth_accounts a ON a.id=r.account_id
     WHERE a.email=$1 AND a.status='active' AND r.token_hash=$2
       AND r.consumed_at IS NULL AND r.expires_at>now()`,
    [input.email, tokenHash(input.resetToken)],
  );
  const record = result.rows[0];
  if (!record) throw new UnauthorizedException();
  return { valid: true as const, expiresAt: record.expires_at.toISOString() };
}
