import { developmentAccounts, fixtureId } from './fixtures.js';

/** Recognize only the documented v1 identities, never arbitrary accounts at a fixture ID. */
export function checkFixtureOwnership(existing: { id: string; email: string }[], owned: boolean) {
  const legacy = ['superadmin', 'admin', 'manager', 'cashier', 'inventory', 'accountant', 'viewer'];
  const valid = owned
    ? existing.every((row) => {
        const account = developmentAccounts.find((item) => item.id === row.id);
        const oldName = legacy.find(
          (name, index) => name.length > 0 && fixtureId(index + 1) === row.id,
        );
        return account && (row.email === account.email || row.email === `${oldName}@example.test`);
      }) &&
      developmentAccounts.every(
        (account) => existing.some((row) => row.id === account.id) || account.id === fixtureId(8),
      )
    : existing.length === 0;
  if (!valid)
    throw new Error(
      'Fixture collision or ownership mismatch. No accounts were changed; use a fresh local database.',
    );
}
