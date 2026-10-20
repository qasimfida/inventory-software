import { partitionVaultStore } from '@inventory/api-client';
import type { VaultStore, VaultRecord } from '@inventory/api-client';
export function createVaultStore(): VaultStore {
  const ready = (async () => {
    const { openDatabaseAsync } = await import('expo-sqlite');
    const db = await openDatabaseAsync('inventory-offline.db');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) > 1)
      throw new Error('Incompatible SQLite schema; upgrade without deleting the database.');
    await db.execAsync('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(
        'CREATE TABLE IF NOT EXISTS vaults (key TEXT PRIMARY KEY,revision INTEGER NOT NULL,envelope TEXT NOT NULL); PRAGMA user_version=1;',
      );
    });
    return db;
  })();
  return partitionVaultStore(
    {
      read: async (key) =>
        (await ready).getFirstAsync<VaultRecord>(
          'SELECT revision,envelope FROM vaults WHERE key=?',
          key,
        ),
      compareAndSwap: async (key, expected, envelope) => {
        const db = await ready;
        let changed = false;
        await db.withExclusiveTransactionAsync(async (tx) => {
          const result =
            expected === null
              ? await tx.runAsync(
                  'INSERT OR IGNORE INTO vaults(key,revision,envelope) VALUES(?,1,?)',
                  key,
                  envelope,
                )
              : await tx.runAsync(
                  'UPDATE vaults SET revision=revision+1,envelope=? WHERE key=? AND revision=?',
                  envelope,
                  key,
                  expected,
                );
          changed = result.changes === 1;
        });
        return changed;
      },
    },
    process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  );
}
