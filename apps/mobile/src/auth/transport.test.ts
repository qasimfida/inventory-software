import { afterEach, expect, it, vi } from 'vitest';
import { authTransport } from './transport';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('native timeout covers the response body and does not replay a financial mutation', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async (url: string, options: RequestInit) => ({
    url,
    ok: true,
    status: 200,
    json: () =>
      new Promise<unknown>((resolve, reject) => {
        void resolve;
        options.signal!.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  }));
  vi.stubGlobal('fetch', fetcher);
  const outcome = authTransport('https://example.test', {
    method: 'POST',
    headers: {},
    credentials: 'omit',
  }).catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(10000);
  expect(await outcome).toBeInstanceOf(Error);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
