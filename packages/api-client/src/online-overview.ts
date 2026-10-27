import type { OnlineClient } from './online-products.js';
import { onlineError, onlineMessages } from './online-messages.js';
import { onlineStoreChanges } from './online-store-setup.js';
export const onlineStoreStatusLabels = {
  not_configured: 'Not configured',
  configured: 'Configured, not live',
  live: 'Live',
  disabled: 'Disabled',
};
export const onlineAttentionLinks = [
  {
    label: 'Products needing changes',
    key: 'changes',
    path: '/online-store/products?tab=changes-required',
  },
  {
    label: 'Sold-out active listings',
    key: 'soldOut',
    path: '/online-store/products?tab=active&attention=sold-out',
  },
  {
    label: 'Listings with warnings',
    key: 'warnings',
    path: '/online-store/products?attention=warnings',
  },
] as const;
type State = {
  overview: Awaited<ReturnType<OnlineClient['overview']>> | null;
  settings: Awaited<ReturnType<OnlineClient['settings']>> | null;
  busy: boolean;
  error: string;
  message: string;
};
/** Session memory only. Retain timestamped snapshots on network failure; clear them on denial. */
export class OnlineOverviewModel {
  private state: State = { overview: null, settings: null, busy: false, error: '', message: '' };
  private generation = 0;
  private commandId: string | null = null;
  private listeners = new Set<() => void>();
  constructor(
    readonly client: OnlineClient,
    private key: () => string,
  ) {}
  snapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  reset = () => {
    this.generation++;
    this.commandId = null;
    this.publish({ overview: null, settings: null, busy: false, error: '', message: '' });
  };
  private fail(error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
    this.publish({
      error: onlineError(error),
      ...([401, 403, 404].includes(status) ? { overview: null, settings: null } : {}),
    });
  }
  refresh = async () => {
    if (this.state.busy) return;
    const generation = this.generation;
    this.publish({ busy: true });
    try {
      const [overview, settings] = await Promise.all([
        this.client.overview(),
        this.client.settings(),
      ]);
      if (generation === this.generation) this.publish({ overview, settings, error: '' });
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.publish({ busy: false });
    }
  };
  recheck = async () => {
    if (this.state.busy || this.state.error || !this.state.overview) return;
    const generation = this.generation;
    this.commandId ??= this.key();
    this.publish({ busy: true, message: '' });
    try {
      await this.client.command({
        action: 'validate',
        all: true,
        items: [],
        idempotencyKey: this.commandId,
      });
      if (generation !== this.generation) return;
      this.commandId = null;
      this.publish({ message: onlineMessages.rechecked, busy: false });
      onlineStoreChanges.notify();
      await this.refresh();
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.publish({ busy: false });
    }
  };
}
