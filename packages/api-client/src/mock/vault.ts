import type { VaultRecord, VaultStore } from '../offline-store.js';
const records = new Map<string, VaultRecord>();
/** Isolated memory storage: demo code must never read or unlock a real offline register. */
export const demoVaultStore: VaultStore = {
  read: async (key) => records.get(key) ?? null,
  compareAndSwap: async (key, expected, envelope) => {
    const record = records.get(key);
    if ((record?.revision ?? null) !== expected) return false;
    records.set(key, { revision: (expected ?? 0) + 1, envelope });
    return true;
  },
};
