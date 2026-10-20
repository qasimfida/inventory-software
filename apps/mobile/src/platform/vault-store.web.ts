import { partitionVaultStore } from '@inventory/api-client';
import type { VaultStore, VaultRecord } from '@inventory/api-client';
export function createVaultStore(): VaultStore {
  let opened: Promise<IDBDatabase> | null = null;
  const database = () =>
    (opened ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('inventory-offline-vaults', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('vaults'))
          request.result.createObjectStore('vaults');
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          opened = null;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        opened = null;
        reject(
          new Error('IndexedDB unavailable or incompatible. Existing vaults were not deleted.'),
        );
      };
      request.onblocked = () =>
        reject(new Error('Close other app windows to finish the storage upgrade.'));
    }));
  return partitionVaultStore(
    {
      read: async (key) => {
        const db = await database();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('vaults', 'readonly'),
            request = tx.objectStore('vaults').get(key);
          request.onsuccess = () => resolve((request.result as VaultRecord | undefined) ?? null);
          request.onerror = () => reject(request.error);
        });
      },
      compareAndSwap: async (key, expected, envelope) => {
        const db = await database();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('vaults', 'readwrite', { durability: 'strict' }),
            store = tx.objectStore('vaults'),
            request = store.get(key);
          let changed = false;
          request.onsuccess = () => {
            const row = request.result as VaultRecord | undefined;
            if ((row?.revision ?? null) !== expected) return;
            store.put({ revision: (expected ?? 0) + 1, envelope }, key);
            changed = true;
          };
          tx.oncomplete = () => resolve(changed);
          tx.onabort = () =>
            reject(
              new Error(
                'Local write failed. Cash checkout was not saved; preserve the existing vault.',
              ),
            );
          tx.onerror = () => reject(tx.error);
        });
      },
    },
    process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  );
}
