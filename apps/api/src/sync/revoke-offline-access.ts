import type { Transaction } from '../database/transaction.js';

// Public transaction boundary for identity administration; pending operations are retained.
export async function revokeOfflineAccess(tx: Transaction, accountId: string) {
  await tx.query(
    'UPDATE offline_leases SET revoked_at=now() WHERE actor_id=$1 AND revoked_at IS NULL',
    [accountId],
  );
}
