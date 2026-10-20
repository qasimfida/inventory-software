import { currencySchema } from '@inventory/contracts';
import type { createSyncClient } from './sync-client.js';
// Lightweight authenticated version notifications; the delta API owns recovery, never this feed.
export class Invalidations {
  private last = '';
  private stopped = false;
  private pending = false;
  constructor(
    private client: ReturnType<typeof createSyncClient>,
    private warehouseId: string,
    private currency: string,
    private changed: () => void,
  ) {}
  async tick() {
    if (this.stopped || this.pending) return;
    this.pending = true;
    try {
      const e = await this.client.events({
        warehouseId: this.warehouseId,
        currency: currencySchema.parse(this.currency),
      });
      const id = e.revision + ':' + e.clockVersion;
      if (!this.stopped && id !== this.last) {
        this.last = id;
        this.changed();
      }
    } catch {
      /* Next successful hint forces recovery, even if server revision is unchanged. */ this.last =
        '';
    } finally {
      this.pending = false;
    }
  }
  stop() {
    this.stopped = true;
  }
}
