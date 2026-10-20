import { expect, it, vi } from 'vitest';
const secure = vi.hoisted(() => ({
  getItemAsync: vi.fn(async () => 'secret'),
  setItemAsync: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));
vi.mock('expo-secure-store', () => ({ ...secure, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' }));
import { createCredentialStore } from './credential-store';
import { createCredentialStore as browserStore } from './credential-store.web';
it('isolates API environments in device-only secure storage and uses cookies for Expo web', async () => {
  const store = createCredentialStore('https://api.example.test');
  await store.set('secret');
  const key = secure.setItemAsync.mock.calls[0]?.[0];
  expect(secure.setItemAsync).toHaveBeenCalledWith(
    expect.stringMatching(/^inventory\.session\.v1\./),
    'secret',
    { keychainAccessible: 'device-only' },
  );
  expect(await store.get()).toBe('secret');
  await store.clear();
  expect(secure.deleteItemAsync).toHaveBeenCalledWith(key, { keychainAccessible: 'device-only' });
  await createCredentialStore('https://staging.example.test').set('other');
  expect(secure.setItemAsync.mock.calls[1]?.[0]).not.toBe(key);
  expect(browserStore()).toBeNull();
});
