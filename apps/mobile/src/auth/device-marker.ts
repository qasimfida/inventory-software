import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
export async function deviceMarker(): Promise<string | null> {
  const scope = Array.from(String(process.env.EXPO_PUBLIC_API_BASE_URL ?? ''), (c) =>
    c.charCodeAt(0).toString(16),
  ).join('-');
  const key = `inventory.device.v1.${scope}`;
  const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  const existing = await SecureStore.getItemAsync(key, options);
  if (existing) return existing;
  const marker = randomUUID();
  await SecureStore.setItemAsync(key, marker, options);
  return marker;
}
