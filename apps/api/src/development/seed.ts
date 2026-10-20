import type { Environment } from '../config/environment.js';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword } from '../auth/secrets.js';
import {
  assertDevelopmentDatabase,
  developmentAccounts,
  developmentPassword,
  fixtureId,
} from './fixtures.js';
import { seedOrganization } from './seed-organization.js';

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
      if (
        (!owned && existing.length) ||
        (owned &&
          (existing.length !== developmentAccounts.length ||
            developmentAccounts.some(
              (a) => !existing.some((e) => e.id === a.id && e.email === a.email),
            )))
      )
        throw new Error(
          'Fixture collision or ownership mismatch. No accounts were changed; use a fresh local database.',
        );
      if (owned && !resetAccounts) return 'preserved';
      for (const account of developmentAccounts) {
        const hash = await hashPassword(developmentPassword);
        if (owned) {
          await tx.query("UPDATE auth_accounts SET password_hash=$1,status='active' WHERE id=$2", [
            hash,
            account.id,
          ]);
          await tx.query(
            'UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',
            [account.id],
          );
        } else {
          await tx.query('INSERT INTO auth_accounts(id,email,password_hash) VALUES($1,$2,$3)', [
            account.id,
            account.email,
            hash,
          ]);
        }
      }
      if (!owned) await seedOrganization(tx);
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
