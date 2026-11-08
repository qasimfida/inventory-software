import { afterEach, expect, it, vi } from 'vitest';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
import { ENVIRONMENT, type Environment } from '../config/environment.js';
import { exchangeResponseSchema } from '@inventory/contracts';
const fixture = organizationFixture();
const root = '/api/v1/auth/exchange-rates';
afterEach(() => vi.unstubAllGlobals());
it('requires authentication and returns safe disabled metadata without a configured source', async () => {
  const f = fixture();
  f.application().get<Environment>(ENVIRONMENT).OPEN_EXCHANGE_RATES_APP_ID = '';
  await f.api().get(root).expect(401);
  expect((await f.api().get(root).set(native(f.viewerToken)).expect(200)).body).toEqual({
    snapshot: null,
    reason: 'not-configured',
  });
});
it('serializes refreshes across requests and preserves valid cache on failure without exposing credentials', async () => {
  const f = fixture();
  f.application().get<Environment>(ENVIRONMENT).OPEN_EXCHANGE_RATES_APP_ID = 'testkey';
  const now = Date.now();
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          base: 'USD',
          timestamp: Math.floor(now / 1000),
          rates: { USD: 1, PKR: 280 },
        }),
      ),
  );
  vi.stubGlobal('fetch', fetchMock);
  const responses = await Promise.all(
    [f.ownerToken, f.otherToken, f.viewerToken].map((token) =>
      f.api().get(root).set(native(token)).expect(200),
    ),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  for (const response of responses) {
    expect(exchangeResponseSchema.parse(response.body).snapshot?.rates.PKR).toBe('280');
    expect(JSON.stringify(response.body)).not.toContain('testkey');
  }
  await f.db().query("UPDATE exchange_rate_cache SET next_attempt_at=now()-interval '1 hour'");
  fetchMock.mockRejectedValue(new Error('provider failed'));
  expect(
    (await f.api().get(root).set(native(f.ownerToken)).expect(200)).body.snapshot.rates.PKR,
  ).toBe('280');
  await f.api().get(root).set(native(f.ownerToken)).expect(200);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const stale = {
    ...responses[0]!.body.snapshot,
    asOf: new Date(now - 90000000).toISOString(),
    expiresAt: new Date(now - 3600000).toISOString(),
  };
  await f.db().query('UPDATE exchange_rate_cache SET snapshot=$1', [JSON.stringify(stale)]);
  expect((await f.api().get(root).set(native(f.ownerToken)).expect(200)).body.reason).toBe('stale');
});
