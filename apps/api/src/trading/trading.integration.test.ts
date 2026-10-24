import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  tradingPageSchema,
  tradingOrderSchema,
  tradingRelationshipSchema,
} from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
describe('explicit bilateral trading', () => {
  const fixture = organizationFixture();
  it('requires consent, hides unrelated tenants and preserves shared terms through idempotent fulfillment', async () => {
    const f = fixture(),
      a = `${f.root}/${f.a}/trading`,
      b = `${f.root}/${f.b}/trading`,
      ha = native(f.ownerToken),
      hb = native(f.otherToken);
    await f.api().get(a).expect(401);
    await f.api().get(a).set(native(f.managerToken)).expect(403);
    const invite = { partnerId: f.b, idempotencyKey: randomUUID() };
    const r = tradingRelationshipSchema.parse(
      (await f.api().post(`${a}/relationships`).set(ha).send(invite).expect(201)).body,
    );
    expect(
      (await f.api().post(`${a}/relationships`).set(ha).send(invite).expect(201)).body.id,
    ).toBe(r.id);
    const input = {
      relationshipId: r.id,
      reference: 'SHARED-1',
      currency: 'USD',
      lines: [
        {
          description: 'Explicitly shared item',
          quantity: '2',
          unit: 'each',
          unitPriceMinor: '200',
        },
      ],
      idempotencyKey: randomUUID(),
    };
    await f.api().post(`${a}/orders`).set(ha).send(input).expect(409);
    await f
      .api()
      .post(`${a}/relationships/${r.id}`)
      .set(ha)
      .send({ action: 'accept', version: 1, idempotencyKey: randomUUID() })
      .expect(409);
    await f
      .api()
      .post(`${b}/relationships/${r.id}`)
      .set(hb)
      .send({ action: 'accept', version: 1, idempotencyKey: randomUUID() })
      .expect(201);
    let order = tradingOrderSchema.parse(
      (await f.api().post(`${a}/orders`).set(ha).send(input).expect(201)).body,
    );
    const third = (
      await f.api().post(f.root).set(ha).send({ name: 'Unrelated business' }).expect(201)
    ).body.id as string;
    const page = tradingPageSchema.parse(
      (await f.api().get(`${f.root}/${third}/trading`).set(ha).expect(200)).body,
    );
    expect(page.orders).toEqual([]);
    await f.api().get(`${f.root}/${third}/trading/orders/${order.id}/history`).set(ha).expect(404);
    await f
      .api()
      .post(`${a}/orders/${order.id}`)
      .set(ha)
      .send({
        action: 'accept',
        version: 1,
        note: 'Buyer cannot accept',
        idempotencyKey: randomUUID(),
      })
      .expect(409);
    for (const action of ['accept', 'dispatch', 'receive']) {
      const base = action === 'receive' ? a : b,
        headers = action === 'receive' ? ha : hb;
      const command = {
        action,
        version: order.version,
        note: `Confirmed ${action}`,
        idempotencyKey: randomUUID(),
      };
      const response = await f
        .api()
        .post(`${base}/orders/${order.id}`)
        .set(headers)
        .send(command)
        .expect(201);
      order = tradingOrderSchema.parse(response.body);
      expect(
        (await f.api().post(`${base}/orders/${order.id}`).set(headers).send(command).expect(201))
          .body,
      ).toEqual(order);
    }
    expect(order.state).toBe('received');
    const history = await f.api().get(`${a}/orders/${order.id}/history`).set(ha).expect(200);
    expect(history.body.events).toHaveLength(4);
    expect(
      (
        await f
          .db()
          .query('SELECT count(*)::int n FROM stock_movements WHERE business_id=$1', [f.a])
      ).rows[0].n,
    ).toBe(0);
    await expect(
      f.db().query("UPDATE trading_orders SET lines='[]' WHERE id=$1", [order.id]),
    ).rejects.toThrow();
    await f.api().get(a).set(hb).expect(404);
  });
  it('rejects revoked relationships, duplicate references and tampered input without partial writes', async () => {
    const f = fixture(),
      a = `${f.root}/${f.a}/trading`,
      ha = native(f.ownerToken);
    const r = tradingPageSchema.parse((await f.api().get(a).set(ha).expect(200)).body)
      .relationships[0]!;
    await f
      .api()
      .post(`${a}/relationships/${r.id}`)
      .set(ha)
      .send({ action: 'revoke', version: r.version, idempotencyKey: randomUUID() })
      .expect(201);
    await f
      .api()
      .post(`${a}/orders`)
      .set(ha)
      .send({
        relationshipId: r.id,
        reference: 'NO-ORDER',
        currency: 'USD',
        lines: [{ description: 'Item', quantity: '1', unit: 'each', unitPriceMinor: '1' }],
        idempotencyKey: randomUUID(),
      })
      .expect(409);
    await f
      .api()
      .post(`${a}/relationships`)
      .set(ha)
      .send({ partnerId: f.a, idempotencyKey: randomUUID() })
      .expect(409);
    await f
      .api()
      .post(`${a}/relationships`)
      .set(ha)
      .send({ partnerId: f.b, actorId: f.ownerId, idempotencyKey: randomUUID() })
      .expect(400);
    expect(
      (await f.db().query('SELECT count(*)::int n FROM trading_orders WHERE buyer_id=$1', [f.a]))
        .rows[0].n,
    ).toBe(1);
  });
});
