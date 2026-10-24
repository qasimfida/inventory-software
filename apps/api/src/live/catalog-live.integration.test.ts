import { expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
import { CatalogLiveAccess } from './catalog-live-access.js';
const fixture = stockFixture();
it('pushes committed changes across sockets, consumes tickets once, and denies tenant/session violations', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    h = native(f.ownerToken);
  await f.api().post(`${path}/catalog-live/ticket`).set(native()).expect(401);
  await f.api().post(`${path}/catalog-live/ticket`).set(native(f.otherToken)).expect(404);
  await f.application().listen(0, '127.0.0.1');
  const address = (f.application().getHttpServer() as Server).address();
  if (!address || typeof address === 'string') throw new Error('Expected test listener');
  const ticket = (await f.api().post(`${path}/catalog-live/ticket`).set(h).expect(201)).body
    .ticket as string;
  // A second tab must not invalidate the first tab's outstanding handshake ticket.
  const secondTicket = (await f.api().post(`${path}/catalog-live/ticket`).set(h).expect(201)).body
    .ticket as string;
  expect(secondTicket).not.toBe(ticket);
  const url = `ws://127.0.0.1:${address.port}/api/v1/catalog-live`;
  const denied = new WebSocket(url, { origin: 'https://untrusted.invalid' });
  await once(denied, 'error');
  const ws = new WebSocket(url, {
    origin: 'http://10.0.2.2:3100',
    headers: { 'x-inventory-client': 'native' },
  });
  try {
    await once(ws, 'open');
    const initial = once(ws, 'message');
    ws.send(ticket);
    const [first] = await initial;
    expect(JSON.parse(String(first)).type).toBe('catalog.changed');
    const access = f.application().get(CatalogLiveAccess);
    await expect(access.consume(secondTicket)).resolves.toMatchObject({ businessId: f.a });
    await expect(access.consume(ticket)).rejects.toThrow();
    const changed = once(ws, 'message');
    await f
      .api()
      .post(`${path}/prices`)
      .set(h)
      .send({
        variantId: f.variantId,
        unitPrice: '19.50',
        currency: 'USD',
        startsAt: '2020-01-01T00:00:00Z',
      })
      .expect(201);
    const [next] = await changed;
    expect(BigInt(JSON.parse(String(next)).revision)).toBeGreaterThan(
      BigInt(JSON.parse(String(first)).revision),
    );
    expect(Object.keys(JSON.parse(String(next))).sort()).toEqual(['clock', 'revision', 'type']);
    const page = await f.api().get(`${path}/products?storeId=${f.storeA}`).set(h).expect(200);
    expect(page.body.items[0].price).toMatchObject({
      unitPrice: '19.500000',
      currency: 'USD',
      unit: 'EACH',
    });
    await f.api().get(`${path}/products?storeId=${f.storeB}`).set(h).expect(403);
    const session = (await f.api().get('/api/v1/auth/session').set(h).expect(200)).body
      .sessionId as string;
    await f.db().query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1', [session]);
    const closing = once(ws, 'close');
    await f.db().query("SELECT pg_notify('inventory_catalog',$1)", [f.a]);
    expect((await closing)[0]).toBe(1008);
  } finally {
    ws.terminate();
  }
});
