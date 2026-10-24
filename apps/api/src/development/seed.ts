import type { Environment } from '../config/environment.js';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword } from '../auth/secrets.js';
import {
  assertDevelopmentDatabase,
  developmentAccounts,
  developmentPassword,
  fixtureId,
} from './fixtures.js';
import { checkFixtureOwnership } from './fixture-ownership.js';
import { seedOrganization } from './seed-organization.js';
import { revokeOfflineAccess } from '../sync/revoke-offline-access.js';

const marker = 'development.fixtures.v1';
export async function seedDevelopment(environment: Environment, resetAccounts = false) {
  assertDevelopmentDatabase(environment);
  const database = new DatabaseService(environment);
  try {
    return await database.transaction(async (tx) => {
      // Concurrent seed processes serialize; all fixtures and ownership evidence commit together.
      await tx.query('SELECT pg_advisory_xact_lock(20261020,1)');
      const owned = (
        await tx.query(
          'SELECT 1 FROM platform_audit WHERE actor_id=$1 AND target_id=$1 AND action=$2',
          [fixtureId(1), marker],
        )
      ).rowCount;
      const existing = (
        await tx.query<{ id: string; email: string }>(
          'SELECT id,email FROM auth_accounts WHERE id=ANY($1::uuid[]) OR email=ANY($2::text[]) FOR UPDATE',
          [developmentAccounts.map((a) => a.id), developmentAccounts.map((a) => a.email)],
        )
      ).rows;
      checkFixtureOwnership(existing, Boolean(owned));
      if (owned && !resetAccounts) return 'preserved';
      for (const account of developmentAccounts) {
        const hash = await hashPassword(developmentPassword);
        if (existing.some((row) => row.id === account.id)) {
          await tx.query(
            "UPDATE auth_accounts SET password_hash=$1,status='active',email=$3 WHERE id=$2",
            [hash, account.id, account.email],
          );
          await tx.query(
            'UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',
            [account.id],
          );
          await tx.query(
            'UPDATE auth_password_resets SET consumed_at=now() WHERE account_id=$1 AND consumed_at IS NULL',
            [account.id],
          );
          await revokeOfflineAccess(tx, account.id);
        } else {
          await tx.query('INSERT INTO auth_accounts(id,email,password_hash) VALUES($1,$2,$3)', [
            account.id,
            account.email,
            hash,
          ]);
        }
      }
      if (!owned) await seedOrganization(tx);
      else if (!existing.some((row) => row.id === fixtureId(8))) {
        // Give the new owner the same existing development business assignments as the admin.
        await tx.query(
          `INSERT INTO business_memberships(business_id,account_id,role,permissions)
           SELECT business_id,$1,'owner','{}' FROM business_memberships WHERE account_id=$2`,
          [fixtureId(8), fixtureId(2)],
        );
      }
      await tx.query('INSERT INTO platform_audit(actor_id,target_id,action) VALUES($1,$1,$2)', [
        fixtureId(1),
        owned ? 'development.accounts.reset' : marker,
      ]);
      return owned ? 'reset' : 'created';
    });
  } finally {
    await database.onApplicationShutdown();
  }
}
