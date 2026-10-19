import { describe, expect, it } from 'vitest';
import { ApiClientError, createApiClient, parseApiOrigin } from './index.js';

describe('API transport boundary', () => {
  it('rejects invalid ports and origin credentials before sending a request', () => {
    for (const origin of [
      'http://localhost:999999',
      'http://:3000',
      'https://user:secret@example.test',
      'https://example.test/api',
      undefined,
    ]) {
      expect(() => parseApiOrigin(origin)).toThrow('API base URL');
    }
    expect(parseApiOrigin('https://EXAMPLE.test:443/')).toBe('https://example.test');
  });
  it('uses the versioned route and validates the response', async () => {
    const urls: string[] = [];
    const client = createApiClient('https://example.test/', async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
    });
    await expect(client.getHealth()).resolves.toEqual({ status: 'ok' });
    expect(urls).toEqual(['https://example.test/api/v1/health/live']);
  });

  it('rejects malformed successful responses', async () => {
    const client = createApiClient('https://example.test', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'unknown' }),
    }));
    await expect(client.getHealth()).rejects.toBeInstanceOf(ApiClientError);
  });

  it('preserves structured server errors without retrying requests', async () => {
    const details = {
      code: 'UNAVAILABLE',
      message: 'Service unavailable.',
      requestId: 'f2905c4a-bdd7-44ae-b01d-ec972853a851',
      retryable: true,
    };
    let calls = 0;
    const client = createApiClient('https://example.test', async () => {
      calls += 1;
      return { ok: false, status: 503, json: async () => details };
    });
    await expect(client.getHealth()).rejects.toMatchObject({ status: 503, details });
    expect(calls).toBe(1);
  });
});
