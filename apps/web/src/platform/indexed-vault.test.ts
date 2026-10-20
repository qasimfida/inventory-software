import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { indexedVaultStore } from './indexed-vault';
it('persists across adapter restart and atomically rejects racing writes', async () => {
  const first = indexedVaultStore(),
    second = indexedVaultStore();
  expect(await first.compareAndSwap('register', null, 'encrypted')).toBe(true);
  expect(await second.read('register')).toEqual({ revision: 1, envelope: 'encrypted' });
  const outcomes = await Promise.all([
    first.compareAndSwap('register', 1, 'next'),
    second.compareAndSwap('register', 1, 'other'),
  ]);
  expect(outcomes.filter(Boolean)).toHaveLength(1);
  expect((await indexedVaultStore().read('register'))?.revision).toBe(2);
  expect(await first.compareAndSwap('register', null, 'overwrite')).toBe(false);
});
