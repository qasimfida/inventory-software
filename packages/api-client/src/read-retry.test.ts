import { expect, it, vi } from 'vitest';
import { withReadRetries } from './read-retry.js';
import { createAuthClient, memoryCredentialStore } from './auth.js';
import type { AuthTransport } from './auth.js';
const options = { method: 'GET', headers: {}, credentials: 'omit' as const };
const response = (status: number, body: unknown = {}) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
it('retries only transient reads with two bounded backoffs', async () => {
  const transport = vi
    .fn<AuthTransport>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(response(503))
    .mockResolvedValue(response(200));
  const pause = vi.fn(async (ms: number) => {
    void ms;
  });
  expect((await withReadRetries(transport, pause)('https://example.test', options)).status).toBe(
    200,
  );
  expect(pause.mock.calls).toEqual([[250], [500]]);
  transport.mockReset().mockResolvedValue(response(504));
  await withReadRetries(transport, pause)('https://example.test', options);
  expect(transport).toHaveBeenCalledTimes(3);
});
it('does not retry mutations, authorization errors, rate limits or conflicts', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const transport = vi.fn<AuthTransport>().mockRejectedValue(new Error('unknown outcome'));
    await expect(
      withReadRetries(transport, async () => {})('https://example.test', { ...options, method }),
    ).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(1);
  }
  for (const status of [400, 401, 403, 404, 409, 429]) {
    const transport = vi.fn<AuthTransport>().mockResolvedValue(response(status));
    await withReadRetries(transport, async () => {})('https://example.test', options);
    expect(transport).toHaveBeenCalledTimes(1);
  }
});
it('validates error metadata and mutation acknowledgements without displaying raw server messages', async () => {
  const details = {
    code: 'FORBIDDEN',
    message: 'sensitive upstream detail',
    requestId: '00000000-0000-4000-8000-000000000001',
    retryable: false,
  };
  const transport = vi.fn<AuthTransport>().mockResolvedValue(response(403, details));
  const store = memoryCredentialStore();
  await store.set('a'.repeat(43));
  const client = createAuthClient('https://example.test', transport, store);
  await expect(client.current()).rejects.toMatchObject({
    status: 403,
    details,
    message: 'You do not have access to this operation.',
  });
  transport.mockResolvedValue(response(200, {}));
  await expect(client.logout()).rejects.toThrow();
  expect(await store.get()).not.toBeNull();
  await expect(
    client.resetPassword('a@example.test', 'new password value', 'a'.repeat(43)),
  ).rejects.toThrow();
  transport.mockResolvedValue(response(201, { ok: true }));
  await client.resetPassword('a@example.test', 'new password value', 'a'.repeat(43));
  expect(await store.get()).toBeNull();
});
