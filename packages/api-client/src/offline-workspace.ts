import type { SyncProgress } from './sync-progress.js';
import { OfflineVault } from './offline-vault.js';
import { SyncEngine } from './sync-engine.js';
import { createSyncClient } from './sync-client.js';
import type { OrganizationTransport } from './organization.js';
import type { VaultStore, RandomBytes } from './offline-store.js';
import type { VaultState } from './offline-state.js';
import { offlineQuote } from '@inventory/domain';
export class OfflineWorkspace {
  private listeners = new Set<() => void>();
  private state: { data: VaultState | null; error: string; busy: boolean; sync?: SyncProgress } = {
    data: null,
    error: '',
    busy: false,
  };
  private vault: OfflineVault | null = null;
  private engine: SyncEngine | null = null;
  private epoch = 0;
  private syncing = false;
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  snapshot = () => this.state;
  private emit() {
    this.listeners.forEach((f) => f());
  }
  constructor(
    private store: () => Promise<VaultStore>,
    private random: RandomBytes,
    private request: OrganizationTransport,
    private uuid: () => string,
  ) {}
  async open(
    name: string,
    password: string,
    setup?: { businessId: string; warehouseId: string; currency: string },
  ) {
    this.lock();
    const epoch = this.epoch;
    this.state = { ...this.state, busy: true };
    this.emit();
    try {
      const store = await this.store();
      const vault = setup
        ? await OfflineVault.create(
            store,
            name,
            password,
            this.random,
            await createSyncClient(this.request, setup.businessId).prepare({
              warehouseId: setup.warehouseId,
              currency: setup.currency,
              deviceId: this.uuid(),
            }),
          )
        : await OfflineVault.unlock(store, name, password, this.random);
      if (epoch !== this.epoch) {
        vault.lock();
        return;
      }
      const data = await vault.read(),
        lease = data.leases[data.activeLeaseId]!;
      if (epoch !== this.epoch) {
        vault.lock();
        return;
      }
      this.vault = vault;
      this.engine = new SyncEngine(
        vault,
        createSyncClient(this.request, lease.businessId),
        () => Date.now(),
        () => Math.random(),
        (progress) => {
          if (epoch !== this.epoch) return;
          this.state = { ...this.state, sync: progress };
          this.emit();
        },
      );
      this.state = { data, error: '', busy: false };
    } catch (e) {
      if (epoch !== this.epoch) return;
      this.state = {
        data: null,
        error: e instanceof Error ? e.message : 'Unable to open vault',
        busy: false,
      };
    }
    this.emit();
  }
  async backup() {
    if (!this.vault) throw new Error('Unlock the cached register before making a backup.');
    return this.vault.backup();
  }
  async restore(name: string, envelope: string, password: string) {
    if (envelope.length > 16 * 1024 * 1024) throw new Error('Backup exceeds the supported size.');
    await OfflineVault.restore(await this.store(), name, envelope, password, this.random);
    await this.open(name, password);
  }
  async run(work: () => Promise<unknown>) {
    const epoch = this.epoch;
    try {
      await work();
      if (epoch === this.epoch && this.vault) {
        const data = await this.vault.read();
        if (epoch === this.epoch) this.state = { ...this.state, data, error: '', busy: false };
      }
    } catch (error) {
      if (epoch === this.epoch) {
        const data = this.vault ? await this.vault.read().catch(() => this.state.data) : null;
        if (epoch === this.epoch)
          this.state = {
            ...this.state,
            data,
            error: error instanceof Error ? error.message : 'Operation failed',
          };
      }
    }
    if (epoch === this.epoch) this.emit();
  }
  sync = async () => {
    if (!this.engine || this.syncing) return;
    const epoch = this.epoch;
    const confirmedBefore = new Set(
      this.state.data?.outbox.filter((e) => e.state === 'synced').map((e) => e.operation.id),
    );
    this.syncing = true;
    try {
      await this.run(async () => {
        await this.engine?.cycle();
      });
      if (epoch !== this.epoch) return;
      const records =
        this.state.data?.outbox.filter((e) => !confirmedBefore.has(e.operation.id)) ?? [];
      const total = records.length;
      const remaining = records.filter((e) => e.state !== 'synced').length;
      this.state = {
        ...this.state,
        sync: {
          phase: this.state.error || remaining ? 'attention' : 'complete',
          total,
          confirmed: Math.max(0, total - remaining),
          remaining,
        },
      };
      this.emit();
    } finally {
      this.syncing = false;
    }
  };
  add(variantId: string, unitId: string, quantity: string, discount: number) {
    return this.run(async () => {
      if (!this.vault) throw new Error('Unlock first');
      await this.vault.append({
        variantId,
        unitId,
        quantity,
        manualDiscountBasisPoints: discount,
        locationId: null,
      });
    });
  }
  editCart(index: number, quantity: string | null) {
    return this.run(async () => {
      if (!this.vault) throw new Error('Unlock first');
      await this.vault.editCart(index, quantity);
    });
  }
  clear = () =>
    this.run(async () => {
      await this.vault?.cart([]);
    });
  checkout = (cash: string) =>
    this.run(async () => {
      await this.vault?.enqueue(this.uuid(), cash);
    });
  retry = (id: string) =>
    this.run(async () => {
      await this.engine?.retry(id);
    });
  reconcile = (id: string, note: string) =>
    this.run(async () => {
      const s = await this.vault!.read(),
        lease = s.leases[s.activeLeaseId]!;
      const result = await createSyncClient(this.request, lease.businessId).reconcile(id, note);
      await this.vault!.update((d) => {
        const e = d.outbox.find((e) => e.operation.id === id);
        if (e) {
          e.result = result;
          e.state = result.state;
          e.error = '';
        }
      });
    });
  total() {
    const s = this.state.data;
    if (!s?.cart.length) return '';
    try {
      return offlineQuote(s.leases[s.activeLeaseId]!, s.cart).totalMinor;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid cart';
    }
  }
  lock = () => {
    this.epoch++;
    this.vault?.lock();
    this.vault = null;
    this.engine = null;
    this.state = { data: null, error: '', busy: false };
    this.emit();
  };
}
