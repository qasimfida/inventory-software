import { expect, it } from 'vitest';
import { quoteSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('applies authorized customer pricing without exposing it in the general catalog', async () => {
  const { api, root, a, storeA, ownerToken, variantId, unitId } = fixture(),
    path = `${root}/${a}`,
    h = native(ownerToken);
  const customerId = String(
    (
      await api()
        .post(`${path}/customers`)
        .set(h)
        .send({ storeId: storeA, code: 'PRICE', name: 'Contract customer', currency: 'USD' })
        .expect(201)
    ).body.id,
  );
  for (const customer of [null, customerId])
    await api()
      .post(`${path}/prices`)
      .set(h)
      .send({
        variantId,
        storeId: storeA,
        customerId: customer,
        unitPrice: customer ? '8' : '10',
        currency: 'USD',
        startsAt: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);
  const quote = async (customerId: string | null) =>
    quoteSchema.parse(
      (
        await api()
          .post(`${path}/price-quotes`)
          .set(h)
          .send({ variantId, unitId, storeId: storeA, customerId, quantity: '2' })
          .expect(201)
      ).body,
    );
  expect((await quote(customerId)).totalMinor).toBe('1600');
  expect((await quote(null)).totalMinor).toBe('2000');
  const catalog = await api().get(`${path}/products/${variantId}/pricing`).set(h).expect(200);
  expect(JSON.stringify(catalog.body)).not.toContain('8.000000');
});
it('anonymizes inactive eligible profiles after configured retention without deleting financial identities', async () => {
  const { api, root, a, storeA, ownerToken, db } = fixture(),
    path = `${root}/${a}`,
    h = native(ownerToken);
  const id = String(
    (
      await api()
        .post(`${path}/customers`)
        .set(h)
        .send({
          storeId: storeA,
          code: 'RETAIN',
          name: 'Erase name',
          email: 'erase@example.test',
          currency: 'USD',
          state: 'inactive',
        })
        .expect(201)
    ).body.id,
  );
  await api()
    .patch(`${path}/customers/retention/policy`)
    .set(h)
    .send({ inactiveDays: 30, version: 1 })
    .expect(200);
  await db().query("UPDATE customers SET last_activity_at=now()-interval '31 days' WHERE id=$1", [
    id,
  ]);
  expect(
    (await api().post(`${path}/customers/retention/run`).set(h).send({}).expect(201)).body
      .anonymized,
  ).toBe(1);
  const result = (await db().query('SELECT name,email,code FROM customers WHERE id=$1', [id]))
    .rows[0];
  expect(result.name).toBe('Anonymized customer');
  expect(result.email).toBe('');
  expect(result.code).not.toBe('RETAIN');
});
