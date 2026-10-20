import { invoke } from '@tauri-apps/api/core';
import type { VaultStore, VaultRecord } from '@inventory/api-client';
// The only browser-tree file allowed to import the desktop bridge; loaded only by Tauri.
export function desktopVaultStore(): VaultStore {
  return {
    read: (key) => invoke<VaultRecord | null>('offline_read', { key }),
    compareAndSwap: (key, expected, envelope) =>
      invoke<boolean>('offline_compare_swap', { key, expected, envelope }),
  };
}
