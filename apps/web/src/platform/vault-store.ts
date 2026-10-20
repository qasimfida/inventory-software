import { partitionVaultStore } from '@inventory/api-client';
import type { VaultStore } from '@inventory/api-client';
import { indexedVaultStore } from './indexed-vault';
export async function createVaultStore(): Promise<VaultStore> {
  if ('__TAURI_INTERNALS__' in window)
    return partitionVaultStore(
      (await import('./desktop-storage')).desktopVaultStore(),
      import.meta.env.VITE_API_BASE_URL as string,
    );
  if (navigator.storage?.persist) await navigator.storage.persist();
  return partitionVaultStore(indexedVaultStore(), import.meta.env.VITE_API_BASE_URL as string);
}
export const vaultRandom = (length: number) => crypto.getRandomValues(new Uint8Array(length));
