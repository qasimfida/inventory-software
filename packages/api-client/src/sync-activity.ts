import type { SyncProgress } from './sync-progress.js';
/** Ephemeral, local task notification. No credentials, records or cross-account history. */
class SyncActivity {
  private state: { progress: SyncProgress; inspect: () => void } | null = null;
  private listeners = new Set<() => void>();
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  publish(progress: SyncProgress, inspect: () => void) {
    const current = { progress, inspect };
    this.state = current;
    this.listeners.forEach((f) => f());
    return () => {
      if (this.state !== current) return;
      this.state = null;
      this.listeners.forEach((f) => f());
    };
  }
}
export const syncActivity = new SyncActivity();
