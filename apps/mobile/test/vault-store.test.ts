import { DatabaseSync } from 'node:sqlite';
import { expect, it, vi } from 'vitest';
import { createVaultStore } from '../src/platform/vault-store';
const database = vi.hoisted(() => ({ db: null as DatabaseSync | null }));
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    const db = (database.db ??= new DatabaseSync(':memory:'));
    const adapter = {
      getFirstAsync: async (sql: string, ...args: string[]) => db.prepare(sql).get(...args) ?? null,
      execAsync: async (sql: string) => {
        db.exec(sql);
      },
      runAsync: async (sql: string, ...args: (string | number)[]) => db.prepare(sql).run(...args),
    };
    return {
      ...adapter,
      withExclusiveTransactionAsync: async (work: (tx: typeof adapter) => Promise<void>) => {
        db.exec('BEGIN IMMEDIATE');
        try {
          await work(adapter);
          db.exec('COMMIT');
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
    };
  },
}));
it('runs the mobile adapter schema and conditional writes against SQLite and reopens durable records', async () => {
  const first = createVaultStore();
  expect(await first.compareAndSwap('till', null, 'cipher')).toBe(true);
  expect(await first.compareAndSwap('till', null, 'overwrite')).toBe(false);
  const reopened = createVaultStore();
  expect(await reopened.read('till')).toEqual({ revision: 1, envelope: 'cipher' });
  expect(await reopened.compareAndSwap('till', 0, 'stale')).toBe(false);
  expect(await reopened.compareAndSwap('till', 1, 'next')).toBe(true);
  database.db!.exec('PRAGMA user_version=99');
  await expect(createVaultStore().read('till')).rejects.toThrow('Incompatible');
  expect(database.db!.prepare('SELECT envelope FROM vaults').get()).toEqual({ envelope: 'next' });
  database.db!.close();
  database.db = null;
});
