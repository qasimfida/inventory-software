import { expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { OfflineVault } from './offline-vault.js';
import { VaultCipher } from './offline-crypto.js';
import { SyncEngine } from './sync-engine.js';
import { migrateVault } from './offline-state.js';
import { leaseSchema } from '@inventory/contracts';
import type { VaultRecord, VaultStore } from './offline-store.js';
import { Invalidations } from './invalidations.js';
const random = (n: number) => new Uint8Array(randomBytes(n)),
  password = 'separate testing passphrase';
function fixture() {
  const variantId = randomUUID(),
    unitId = randomUUID(),
    warehouseId = randomUUID();
  const lease = leaseSchema.parse({
    id: randomUUID(),
    businessId: randomUUID(),
    actorId: randomUUID(),
    deviceId: randomUUID(),
    warehouseId,
    shiftId: randomUUID(),
    currency: 'USD',
    createdAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    policy: { enabled: true },
    snapshot: {
      warehouseId,
      storeId: randomUUID(),
      currency: 'USD',
      revision: '1',
      cursor: randomUUID(),
      items: [
        {
          id: variantId,
          name: 'Test',
          sku: 'TEST',
          barcodes: [],
          trackInventory: true,
          units: [{ id: unitId, code: 'EA', numerator: '1', denominator: '1' }],
          priceId: randomUUID(),
          unitPrice: '10',
          currency: 'USD',
          taxBasisPoints: 0,
          taxInclusive: false,
          promotions: [],
          available: '10',
        },
      ],
    },
  });
  let row: VaultRecord | null = null;
  const store: VaultStore = {
    read: async () => row,
    compareAndSwap: async (key, expected, envelope) => {
      void key;
      if ((row?.revision ?? null) !== expected) return false;
      row = { revision: (expected ?? 0) + 1, envelope };
      return true;
    },
  };
  const line = { variantId, unitId, quantity: '1', locationId: null, manualDiscountBasisPoints: 0 };
  return { lease, store, line };
}
it('persists cart, sale and stable ID across restart; lost commit responses replay without duplicate sale', async () => {
  const { lease, store, line } = fixture();
  let vault = await OfflineVault.create(store, 'test', password, random, lease);
  await vault.cart([line]);
  vault.lock();
  vault = await OfflineVault.unlock(store, 'test', password, random);
  expect((await vault.read()).cart).toEqual([line]);
  const id = randomUUID();
  await vault.enqueue(id, '1000');
  await vault.enqueue(id, '1000');
  expect((await vault.read()).outbox).toHaveLength(1);
  expect((await vault.read()).cart).toEqual([]);
  let calls = 0;
  const saleId = randomUUID(),
    committed = new Set<string>();
  const client = {
    identity: async () => ({ actorId: lease.actorId }),
    upload: vi.fn(async (ops: { id: string }[]) => {
      for (const op of ops) committed.add(op.id);
      if (++calls === 1) throw new Error('lost response after commit');
      return {
        results: ops.map((o) => ({
          id: o.id,
          state: 'synced' as const,
          code: 'CONFIRMED',
          saleId,
        })),
      };
    }),
    pull: async () => ({
      actorId: lease.actorId,
      cursor: randomUUID(),
      revision: '1',
      reset: true,
      replaceAll: true,
      items: lease.snapshot.items,
      removed: [],
      topics: [],
    }),
    prepare: async () => lease,
    policy: async () => lease.policy,
    savePolicy: async () => lease.policy,
    reconcile: async () => ({ id, state: 'synced' as const, code: 'CONFIRMED', saleId }),
    events: async () => ({ revision: '1', clockVersion: 1 }),
  };
  await expect(new SyncEngine(vault, client).cycle()).rejects.toThrow('lost response');
  expect((await vault.read()).outbox[0]!.state).toBe('pending');
  vault.lock();
  vault = await OfflineVault.unlock(store, 'test', password, random);
  const engine = new SyncEngine(vault, client);
  await engine.retry(id);
  await engine.cycle();
  expect(committed.size).toBe(1);
  expect((await vault.read()).outbox[0]!.result?.saleId).toBe(saleId);
  expect((await vault.read()).cache.cursor).not.toBe(lease.snapshot.cursor);
}, 20000);
it('fails closed for wrong passwords, tampering, future schemas and preserves ciphertext', async () => {
  const { lease, store } = fixture();
  const vault = await OfflineVault.create(store, 'safe', password, random, lease),
    before = await store.read('safe');
  await expect(
    OfflineVault.unlock(store, 'safe', 'a different passphrase', random),
  ).rejects.toThrow();
  expect(await store.read('safe')).toEqual(before);
  const cipher = await VaultCipher.unlock(password, random, before!.envelope);
  await store.compareAndSwap(
    'safe',
    before!.revision,
    cipher.seal({ ...(await vault.read()), schema: 999 }),
  );
  await expect(vault.read()).rejects.toThrow();
  const future = await store.read('safe');
  await expect(OfflineVault.unlock(store, 'safe', password, random)).rejects.toThrow();
  expect(await store.read('safe')).toEqual(future);
  const envelope = JSON.parse(before!.envelope);
  envelope.cipher = '00' + envelope.cipher.slice(2);
  expect(() => cipher.open(JSON.stringify(envelope))).toThrow();
  cipher.lock();
}, 20000);
it('migrates old documents, rejects expired permission and protects the original account partition', async () => {
  const { lease, store, line } = fixture();
  const vault = await OfflineVault.create(store, 'test', password, random, lease);
  const state = await vault.read();
  expect(migrateVault({ ...state, schema: 1 }).schema).toBe(2);
  await vault.update((s) => {
    s.leases[s.activeLeaseId]!.expiresAt = new Date(Date.now() - 1).toISOString();
  });
  await expect(vault.cart([line])).rejects.toThrow('expired');
  const upload = vi.fn();
  await expect(
    new SyncEngine(vault, {
      identity: async () => ({ actorId: randomUUID() }),
      upload,
    } as never).cycle(),
  ).rejects.toThrow('original vault account');
  expect(upload).not.toHaveBeenCalled();
}, 10000);
it('deduplicates notifications and recovers missed revisions and time-sensitive price transitions', async () => {
  let revision = '1',
    clockVersion = 1,
    failed = false;
  const changed = vi.fn();
  const feed = new Invalidations(
    {
      events: async () => {
        if (failed) throw new Error('offline');
        return { revision, clockVersion };
      },
    } as never,
    'warehouse',
    'USD',
    changed,
  );
  await feed.tick();
  await feed.tick();
  expect(changed).toHaveBeenCalledTimes(1);
  failed = true;
  await feed.tick();
  revision = '9';
  failed = false;
  await feed.tick();
  clockVersion = 2;
  await feed.tick();
  expect(changed).toHaveBeenCalledTimes(3);
  feed.stop();
  revision = '10';
  await feed.tick();
  expect(changed).toHaveBeenCalledTimes(3);
});
