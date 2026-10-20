import { expect, it } from 'vitest';
import { partitionVaultStore } from './vault-partition.js';
import type { VaultStore, VaultRecord } from './offline-store.js';
it('isolates equal vault names across API environments and normalizes equivalent origins', async () => {
  const records = new Map<string, VaultRecord>();
  const store: VaultStore = {
    read: async (key) => records.get(key) ?? null,
    compareAndSwap: async (key, revision, envelope) => {
      if ((records.get(key)?.revision ?? null) !== revision) return false;
      records.set(key, { revision: (revision ?? 0) + 1, envelope });
      return true;
    },
  };
  const production = partitionVaultStore(store, 'https://api.example.test'),
    staging = partitionVaultStore(store, 'https://staging.example.test');
  await production.compareAndSwap('register', null, 'production ciphertext');
  expect(await staging.read('register')).toBeNull();
  await staging.compareAndSwap('register', null, 'staging ciphertext');
  expect((await production.read('register'))?.envelope).toBe('production ciphertext');
  expect(
    (await partitionVaultStore(store, 'https://API.example.test:443/').read('register'))?.envelope,
  ).toBe('production ciphertext');
});
