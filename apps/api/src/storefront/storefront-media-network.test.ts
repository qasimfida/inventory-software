import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, expect, it, vi } from 'vitest';
const { lookup, request } = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup }));
vi.mock('node:https', () => ({ request }));
import { fetchOnlineImage } from './storefront-media-fetch.js';
beforeEach(() => {
  vi.clearAllMocks();
  lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
});
function respond(statusCode: number, bytes: Buffer) {
  request.mockImplementation(
    (
      url: URL,
      options: object,
      callback: (response: PassThrough & { statusCode: number }) => void,
    ) => {
      void url;
      void options;
      const response = Object.assign(new PassThrough(), { statusCode });
      const req = Object.assign(new EventEmitter(), {
        end: () => {
          callback(response);
          response.end(bytes);
          queueMicrotask(() => req.emit('close'));
        },
        destroy: (error?: Error) => {
          if (error) req.emit('error', error);
          req.emit('close');
        },
      });
      return req;
    },
  );
}
it('rejects private or mixed DNS answers before connecting', async () => {
  lookup.mockResolvedValue([
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ]);
  await expect(fetchOnlineImage(new URL('https://images.example.com/a'))).rejects.toThrow(
    'Blocked',
  );
  expect(request).not.toHaveBeenCalled();
});
it('never follows redirects and rejects oversized responses', async () => {
  respond(302, Buffer.from('redirect'));
  await expect(fetchOnlineImage(new URL('https://images.example.com/a'))).rejects.toThrow(
    'unavailable',
  );
  expect(request).toHaveBeenCalledTimes(1);
  respond(200, Buffer.alloc(2 * 1024 * 1024 + 1));
  await expect(fetchOnlineImage(new URL('https://images.example.com/a'))).rejects.toThrow('large');
});
it('keeps the original TLS hostname and supplies a pinned address, without auth headers', async () => {
  respond(200, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(await fetchOnlineImage(new URL('https://images.example.com/a'))).toContain(
    'data:image/png;base64,',
  );
  const call = request.mock.calls[0]!;
  expect(call[0].hostname).toBe('images.example.com');
  expect(call[1].headers).toEqual({ Accept: 'image/png,image/jpeg,image/webp,image/gif' });
  const callback = vi.fn();
  call[1].lookup('images.example.com', { all: false }, callback);
  expect(callback).toHaveBeenCalledWith(null, '8.8.8.8', 4);
});
