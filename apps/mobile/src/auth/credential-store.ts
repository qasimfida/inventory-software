import * as SecureStore from 'expo-secure-store';
import { parseApiOrigin } from '@inventory/api-client';
import type { CredentialStore } from '@inventory/api-client';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export function createCredentialStore(origin: string): CredentialStore {
  // Reversible namespace encoding, not encryption. Never send another environment's token.
  const scope = Array.from(parseApiOrigin(origin), (character) =>
    character.charCodeAt(0).toString(16),
  ).join('-');
  const key = `inventory.session.v1.${scope}`;
  return {
    get: () => SecureStore.getItemAsync(key, options),
    set: (token) => SecureStore.setItemAsync(key, token, options),
    clear: () => SecureStore.deleteItemAsync(key, options),
  };
}
