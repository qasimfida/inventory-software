import type { OfflineLease, OfflineSale } from '@inventory/contracts';
import { offlineSaleSchema } from '@inventory/contracts';
import { offlineQuote, decimal } from '@inventory/domain';
import type { VaultStore, RandomBytes } from './offline-store.js';
import { VaultCipher } from './offline-crypto.js';
import { migrateVault } from './offline-state.js';
import { addCartLine } from './cart-lines.js';
import type { VaultState } from './offline-state.js';
export class OfflineVault {
  private constructor(
    private store: VaultStore,
    readonly name: string,
    private cipher: VaultCipher,
  ) {}
  static async create(
    store: VaultStore,
    name: string,
    password: string,
    random: RandomBytes,
    lease: OfflineLease,
  ) {
    checkName(name);
    const cipher = await VaultCipher.unlock(password, random),
      state: VaultState = {
        schema: 2,
        activeLeaseId: lease.id,
        leases: { [lease.id]: lease },
        cache: lease.snapshot,
        cart: [],
        outbox: [],
        lastSeen: Date.now(),
        lastSync: null,
        error: '',
      };
    if (!(await store.compareAndSwap(name, null, cipher.seal(state)))) {
      cipher.lock();
      throw new Error('Vault already exists. Unlock it; never overwrite pending work.');
    }
    return new OfflineVault(store, name, cipher);
  }
  static async unlock(store: VaultStore, name: string, password: string, random: RandomBytes) {
    checkName(name);
    const record = await store.read(name);
    if (!record) throw new Error('Offline vault not found. Prepare it online first.');
    const cipher = await VaultCipher.unlock(password, random, record.envelope),
      vault = new OfflineVault(store, name, cipher);
    try {
      await vault.read();
      return vault;
    } catch (error) {
      cipher.lock();
      throw error;
    }
  }
  async read() {
    const record = await this.store.read(this.name);
    if (!record) throw new Error('Vault is unavailable.');
    return migrateVault(this.cipher.open(record.envelope));
  }
  async update(work: (state: VaultState) => void) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const record = await this.store.read(this.name);
      if (!record) throw new Error('Vault is unavailable.');
      const state = migrateVault(this.cipher.open(record.envelope));
      work(state);
      migrateVault(state);
      if (await this.store.compareAndSwap(this.name, record.revision, this.cipher.seal(state)))
        return state;
    }
    throw new Error('Another window is updating this vault. Retry without clearing data.');
  }
  async append(line: OfflineSale['lines'][number]) {
    return this.update((s) => {
      this.allow(s);
      s.cart = addCartLine(s.cart, line);
    });
  }
  async cart(lines: OfflineSale['lines']) {
    return this.update((s) => {
      this.allow(s);
      s.cart = lines;
    });
  }
  async editCart(index: number, quantity: string | null) {
    return this.update((state) => {
      this.allow(state);
      if (!Number.isInteger(index) || !state.cart[index])
        throw new Error('Cart line changed. Refresh the cart.');
      if (quantity === null) state.cart.splice(index, 1);
      else state.cart[index] = { ...state.cart[index], quantity };
    });
  }
  async enqueue(id: string, cashReceivedMinor: string) {
    return this.update((s) => {
      this.allow(s);
      if (s.outbox.some((e) => e.operation.id === id)) return;
      const lease = s.leases[s.activeLeaseId]!,
        quote = offlineQuote(lease, s.cart);
      const committed = s.outbox
        .filter((e) => e.operation.leaseId === lease.id)
        .reduce((n, e) => n + BigInt(e.operation.totalMinor), 0n);
      if (committed + BigInt(quote.totalMinor) > BigInt(lease.policy.maxLeaseMinor))
        throw new Error('Offline lease cash limit reached. Reconnect or request review.');
      if (lease.policy.requireCachedStock) {
        for (const item of lease.snapshot.items.filter((i) => i.trackInventory)) {
          const sold = s.outbox
            .filter((e) => e.operation.leaseId === lease.id)
            .flatMap((e) => offlineQuote(lease, e.operation.lines).lines)
            .filter((l) => l.variantId === item.id)
            .reduce((n, l) => n + decimal(l.baseQuantity), 0n);
          const next = quote.lines
            .filter((l) => l.variantId === item.id)
            .reduce((n, l) => n + decimal(l.baseQuantity), sold);
          if (next > decimal(item.available))
            throw new Error('This terminal has exhausted its cached stock allowance.');
        }
      }
      const operation = offlineSaleSchema.parse({
        id,
        kind: 'sale',
        leaseId: lease.id,
        occurredAt: new Date().toISOString(),
        lines: s.cart,
        totalMinor: quote.totalMinor,
        cashReceivedMinor,
      });
      if (BigInt(cashReceivedMinor) < BigInt(quote.totalMinor))
        throw new Error('Offline credit is not allowed. Confirm full cash received.');
      s.outbox.push({
        operation,
        state: 'pending',
        attempts: 0,
        nextRetryAt: 0,
        result: null,
        error: '',
      });
      s.cart = [];
    });
  }
  async renew(lease: OfflineLease) {
    return this.update((s) => {
      const old = s.leases[s.activeLeaseId]!;
      if (
        old.actorId !== lease.actorId ||
        old.businessId !== lease.businessId ||
        old.warehouseId !== lease.warehouseId ||
        old.deviceId !== lease.deviceId
      )
        throw new Error('Vault identity does not match.');
      s.leases[lease.id] = lease;
      s.activeLeaseId = lease.id;
      s.cache = lease.snapshot;
      s.lastSeen = Date.now();
      s.error = 'Permission renewed. Review current cart prices before accepting cash.';
    });
  }
  private allow(s: VaultState) {
    const now = Date.now(),
      lease = s.leases[s.activeLeaseId];
    if (
      !lease ||
      !lease.policy.enabled ||
      now < Date.parse(lease.createdAt) - 1000 ||
      now < s.lastSeen - 1000 ||
      now > Date.parse(lease.expiresAt)
    )
      throw new Error(
        'Offline permission expired or device clock changed. Reconnect; pending records are retained.',
      );
    s.lastSeen = now;
  }
  lock() {
    this.cipher.lock();
  }
  async backup() {
    const row = await this.store.read(this.name);
    if (!row) throw new Error('Vault missing.');
    return row.envelope;
  }
  static async restore(
    store: VaultStore,
    name: string,
    envelope: string,
    password: string,
    random: RandomBytes,
  ) {
    checkName(name);
    const cipher = await VaultCipher.unlock(password, random, envelope);
    try {
      migrateVault(cipher.open(envelope));
      if (!(await store.compareAndSwap(name, null, envelope)))
        throw new Error('Restore requires an unused vault name.');
    } finally {
      cipher.lock();
    }
  }
}

function checkName(name: string) {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name))
    throw new Error('Vault name must contain 1–64 letters, numbers, underscores or hyphens.');
}
