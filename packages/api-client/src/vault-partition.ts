import { apiOriginSchema } from '@inventory/contracts';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import type { VaultStore } from './offline-store.js';
/** Separate production/test API origins even when the installed application is reused. */
export function partitionVaultStore(store: VaultStore, apiOrigin: string): VaultStore {
  const prefix =
    bytesToHex(sha256(utf8ToBytes(apiOriginSchema.parse(apiOrigin)))).slice(0, 32) + '_';
  return {
    read: (name) => store.read(prefix + name),
    compareAndSwap: (name, revision, envelope) =>
      store.compareAndSwap(prefix + name, revision, envelope),
  };
}
