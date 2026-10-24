import { expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { offlineFixture } from '../test/offline-fixture.js';
import { OfflineVault } from './offline-vault.js';
import { SyncEngine } from './sync-engine.js';
import { claimOutbox } from './outbox-claim.js';
import type { createSyncClient } from './sync-client.js';
import type { OfflineLease, SyncResult } from '@inventory/contracts';
const random = (n: number) => new Uint8Array(randomBytes(n));
const password = 'separate race test passphrase';
function clientFor(lease: OfflineLease): ReturnType<typeof createSyncClient> {
  return {
    identity: async () => ({ actorId: lease.actorId }),
    upload: async (ops) => ({
      results: ops.map((o) => ({
        id: o.id,
        state: 'synced',
        code: 'CONFIRMED',
        saleId: randomUUID(),
      })),
    }),
    pull: async () => ({
      actorId: lease.actorId,
      cursor: randomUUID(),
      revision: '1',
      reset: false,
      replaceAll: true,
      items: lease.snapshot.items,
      removed: [],
      topics: [],
    }),
    prepare: async () => lease,
    policy: async () => lease.policy,
    savePolicy: async () => lease.policy,
    reconcile: async (id) => ({ id, state: 'synced', code: 'CONFIRMED', saleId: randomUUID() }),
    events: async () => ({ revision: '1', clockVersion: 1 }),
  };
}

it('atomically claims once across vault instances and respects persisted restart backoff and exhaustion', async () => {
  const { store, lease, line } = offlineFixture();
  const vault = await OfflineVault.create(store, 'race', password, random, lease);
  await vault.cart([line]);
  await vault.enqueue(randomUUID(), '1000');
  const other = await OfflineVault.unlock(store, 'race', password, random);
  const now = Date.now();
  const claims = await Promise.all([
    claimOutbox(vault, now, () => 0.5),
    claimOutbox(other, now, () => 0.5),
  ]);
  expect(claims.map((c) => c.length).sort()).toEqual([0, 1]);
  vault.lock();
  const restart = await OfflineVault.unlock(store, 'race', password, random);
  expect(await claimOutbox(restart, now + 1, () => 0.5)).toEqual([]);
  const before = (await restart.read()).outbox[0]!.operation;
  await restart.update((s) => {
    s.outbox[0]!.attempts = 8;
    s.outbox[0]!.nextRetryAt = now;
  });
  expect(await claimOutbox(restart, now + 3000, () => 0.5)).toEqual([]);
  expect((await restart.read()).outbox[0]).toMatchObject({ state: 'conflict', operation: before });
}, 20000);

it('a delayed negative upload cannot downgrade a confirmed result from another engine', async () => {
  const { store, lease, line } = offlineFixture();
  const vault = await OfflineVault.create(store, 'late', password, random, lease);
  await vault.cart([line]);
  const id = randomUUID();
  await vault.enqueue(id, '1000');
  let deliver!: (value: { results: SyncResult[] }) => void;
  let started!: () => void;
  const sending = new Promise<void>((resolve) => {
    started = resolve;
  });
  const first = clientFor(lease);
  first.upload = () => {
    started();
    return new Promise((resolve) => {
      deliver = resolve;
    });
  };
  const now = Date.now();
  const running = new SyncEngine(
    vault,
    first,
    () => now,
    () => 0.5,
  ).cycle();
  await sending;
  const second = await OfflineVault.unlock(store, 'late', password, random);
  await new SyncEngine(second, clientFor(lease), () => now + 10000).cycle();
  const confirmed = (await second.read()).outbox[0]!.result;
  deliver({ results: [{ id, state: 'conflict', code: 'REVIEW_REQUIRED' }] });
  await running;
  expect((await vault.read()).outbox[0]).toMatchObject({ state: 'synced', result: confirmed });
}, 20000);

it('malformed batch acknowledgements retain immutable pending work for a same-ID retry', async () => {
  const { store, lease, line } = offlineFixture();
  const vault = await OfflineVault.create(store, 'partial', password, random, lease);
  await vault.cart([line]);
  const id = randomUUID();
  await vault.enqueue(id, '1000');
  const client = clientFor(lease);
  client.upload = vi.fn(async () => ({ results: [] }));
  await expect(new SyncEngine(vault, client).cycle()).rejects.toThrow('Incomplete batch');
  expect((await vault.read()).outbox[0]).toMatchObject({
    state: 'pending',
    operation: { id },
    result: null,
  });
}, 20000);

it('merges concurrent cached additions atomically and retains the quantity after restart', async () => {
  const { store, lease, line } = offlineFixture();
  const first = await OfflineVault.create(store, 'cart-race', password, random, lease);
  const second = await OfflineVault.unlock(store, 'cart-race', password, random);
  await Promise.all([first.append(line), second.append(line)]);
  first.lock();
  second.lock();
  const restored = await OfflineVault.unlock(store, 'cart-race', password, random);
  expect((await restored.read()).cart).toEqual([{ ...line, quantity: '2' }]);
}, 20000);
