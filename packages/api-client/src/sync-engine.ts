import type { SyncProgress } from './sync-progress.js';
import { canonicalJson } from '@inventory/domain';
import type { OfflineVault } from './offline-vault.js';
import type { createSyncClient } from './sync-client.js';
import { claimOutbox } from './outbox-claim.js';
export class SyncEngine {
  private running = false;
  constructor(
    private vault: OfflineVault,
    private client: ReturnType<typeof createSyncClient>,
    private now = () => Date.now(),
    private random = () => Math.random(),
    private progress: (value: SyncProgress) => void = () => {},
  ) {}
  async cycle() {
    if (this.running) return;
    this.running = true;
    try {
      const s = await this.vault.read();
      if ((await this.client.identity()).actorId !== s.leases[s.activeLeaseId]!.actorId)
        throw new Error('Sign in with the original vault account before synchronizing.');
      const ids = s.outbox.filter((e) => e.state !== 'synced').map((e) => e.operation.id);
      this.progress({ phase: 'uploading', total: ids.length, confirmed: 0, remaining: ids.length });
      let batchSize: number;
      do {
        batchSize = await this.upload();
        const uploaded = await this.vault.read();
        const confirmed = uploaded.outbox.filter(
          (e) => ids.includes(e.operation.id) && e.state === 'synced',
        ).length;
        this.progress({
          phase: batchSize === 20 ? 'uploading' : 'downloading',
          total: ids.length,
          confirmed,
          remaining: ids.length - confirmed,
        });
      } while (batchSize === 20);
      await this.download();
      const latest = await this.vault.read(),
        lease = latest.leases[latest.activeLeaseId]!;
      if (
        latest.outbox.every((e) => e.state === 'synced') &&
        (latest.cache.revision !== lease.snapshot.revision ||
          canonicalJson(latest.cache.items) !== canonicalJson(lease.snapshot.items) ||
          this.now() > Date.parse(lease.expiresAt) - 60000)
      )
        await this.vault.renew(
          await this.client.prepare({
            warehouseId: lease.warehouseId,
            currency: lease.currency,
            deviceId: lease.deviceId,
          }),
        );
    } finally {
      this.running = false;
    }
  }
  private async upload() {
    const claimed = await claimOutbox(this.vault, this.now(), this.random);
    const ids = claimed.map((entry) => entry.operation.id);
    if (!ids.length) return 0;
    try {
      const response = await this.client.upload(claimed.map((e) => e.operation));
      if (
        response.results.length !== ids.length ||
        new Set(response.results.map((r) => r.id)).size !== ids.length ||
        response.results.some((r) => !ids.includes(r.id))
      )
        throw new Error('Incomplete batch response');
      await this.vault.update((s) => {
        for (const result of response.results) {
          const e = s.outbox.find((e) => e.operation.id === result.id);
          if (!e || e.state === 'synced') continue;
          e.state = result.state;
          e.result = result;
          e.error = result.state === 'synced' ? '' : result.code;
        }
        s.error = '';
      });
      return ids.length;
    } catch (error) {
      await this.vault.update((s) => {
        const status = error instanceof Error && 'status' in error ? Number(error.status) : 0;
        for (const e of s.outbox)
          if (
            e.state === 'sending' &&
            claimed.some((c) => c.operation.id === e.operation.id && c.attempts === e.attempts)
          ) {
            e.state = e.attempts >= 8 || [401, 403, 404].includes(status) ? 'conflict' : 'pending';
            e.error = [401, 403, 404].includes(status)
              ? 'Sign in with the original account; review access before retry.'
              : 'Outcome unknown. Retained for retry; do not record a duplicate sale.';
            e.nextRetryAt =
              this.now() +
              Math.min(300000, 1000 * 2 ** Math.min(e.attempts, 8)) * (0.75 + this.random() / 2);
          }
        s.error = 'Upload interrupted. All local records are retained.';
      });
      throw error;
    }
  }
  private async download() {
    const state = await this.vault.read(),
      lease = state.leases[state.activeLeaseId]!;
    const delta = await this.client.pull({
      warehouseId: lease.warehouseId,
      currency: lease.currency,
      cursor: state.cache.cursor,
    });
    if (delta.actorId !== lease.actorId)
      throw new Error('Account changed during synchronization. Unlock with the original account.');
    await this.vault.update((s) => {
      if (s.cache.cursor !== state.cache.cursor) return;
      const items = new Map((delta.replaceAll ? [] : s.cache.items).map((i) => [i.id, i]));
      for (const id of delta.removed) items.delete(id);
      for (const item of delta.items) items.set(item.id, item);
      s.cache = {
        ...s.cache,
        items: [...items.values()],
        cursor: delta.cursor,
        revision: delta.revision,
      };
      s.lastSync = this.now();
      s.error = delta.reset
        ? 'Server cursor reset; snapshots refreshed and pending operations preserved.'
        : '';
    });
  }
  retry(id: string) {
    return this.vault.update((s) => {
      const e = s.outbox.find((e) => e.operation.id === id);
      if (e && e.state !== 'synced') {
        e.state = 'pending';
        e.attempts = 0;
        e.nextRetryAt = 0;
        e.error = '';
      }
    });
  }
}
