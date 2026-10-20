import { OfflineVault } from './offline-vault.js';
import { SyncEngine } from './sync-engine.js';
import { createSyncClient } from './sync-client.js';
import type { OrganizationTransport } from './organization.js';
import type { VaultStore, RandomBytes } from './offline-store.js';
import type { VaultState } from './offline-state.js';
import { offlineQuote } from '@inventory/domain';
export class OfflineWorkspace {
  private listeners = new Set<() => void>();
  private state: { data: VaultState | null; error: string; busy: boolean } = {
    data: null,
    error: '',
    busy: false,
  };
  private vault: OfflineVault | null = null;
  private engine: SyncEngine | null = null;
  private epoch = 0;
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
      this.engine = new SyncEngine(vault, createSyncClient(this.request, lease.businessId));
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
  async run(work: () => Promise<unknown>) {
    const epoch = this.epoch;
    try {
      await work();
      if (epoch === this.epoch && this.vault) {
        const data = await this.vault.read();
        if (epoch === this.epoch) this.state = { data, error: '', busy: false };
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
  sync = () =>
    this.run(async () => {
      if (!this.engine) return;
      await this.engine.cycle();
    });
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
