import { expect, it, vi } from 'vitest';
import { createAuthClient, memoryCredentialStore } from './auth.js';
import type { AuthTransport } from './auth.js';
const session = {
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'user@example.test',
    status: 'active',
  },
  sessionId: '00000000-0000-4000-8000-000000000002',
  expiresAt: '2030-01-01T00:00:00.000Z',
  absoluteExpiresAt: '2030-01-01T12:00:00.000Z',
};
const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

it('keeps browser tokens out of application storage and uses credentialed requests', async () => {
  const transport = vi.fn<AuthTransport>().mockResolvedValue(response(session));
  const client = createAuthClient('https://api.example.test', transport, null);
  expect(await client.login('user@example.test', 'password')).toEqual(session);
  expect(transport.mock.calls[0]![1]).toMatchObject({
    credentials: 'include',
    headers: { 'x-inventory-client': 'web' },
  });
  expect(transport.mock.calls[0]![1].headers.authorization).toBeUndefined();
});
it('serializes native renewal and protected requests, then clears revoked credentials', async () => {
  const store = memoryCredentialStore();
  await store.set('a'.repeat(43));
  const transport = vi
    .fn<AuthTransport>()
    .mockResolvedValueOnce(response({ ...session, token: 'b'.repeat(43) }))
    .mockResolvedValueOnce(response(session))
    .mockResolvedValueOnce(response({}, 401));
  const client = createAuthClient('https://api.example.test', transport, store);
  const [renewed] = await Promise.all([client.renew(), client.current()]);
  expect(renewed).not.toHaveProperty('token');
  expect(transport.mock.calls[1]![1].headers.authorization).toBe(`Bearer ${'b'.repeat(43)}`);
  await expect(client.current()).rejects.toMatchObject({ status: 401 });
  expect(await store.get()).toBeNull();
});
it('attempts revocation when native secure storage fails instead of reporting login success', async () => {
  const store = {
    get: async () => null,
    set: async () => {
      throw new Error('vault locked');
    },
    clear: vi.fn(async () => undefined),
  };
  const transport = vi
    .fn<AuthTransport>()
    .mockResolvedValueOnce(response({ ...session, token: 'a'.repeat(43) }))
    .mockResolvedValueOnce(response({ ok: true }));
  const client = createAuthClient('https://api.example.test', transport, store);
  await expect(client.login('user@example.test', 'password')).rejects.toThrow('vault locked');
  expect(transport.mock.calls[1]![0]).toMatch(/auth\/logout$/);
  expect(store.clear).toHaveBeenCalled();
});
it('does not claim successful server logout when offline', async () => {
  const store = memoryCredentialStore();
  await store.set('a'.repeat(43));
  const client = createAuthClient(
    'https://api.example.test',
    async () => {
      throw new Error('offline');
    },
    store,
  );
  await expect(client.logout()).rejects.toThrow('offline');
  expect(await store.get()).toBe('a'.repeat(43));
});
