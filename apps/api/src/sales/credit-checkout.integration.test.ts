import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
it('serializes concurrent HTTP credit checkouts, rejects cashier overrides and reconciles full credit', async () => {
  const f = fixture(),
    customer = (
      await f
        .api()
        .post(`${f.path}/customers`)
        .set(f.h)
        .send({ storeId: f.storeA, code: 'LIMIT', name: 'Limited credit', currency: 'USD' })
        .expect(201)
    ).body;
  await f
    .api()
    .patch(`${f.path}/customers/${customer.id}/credit`)
    .set(f.h)
    .send({
      creditEnabled: true,
      creditHold: false,
      creditLimitMinor: '2000',
      termsDays: 14,
      version: 1,
    })
    .expect(200);
  const q = await f.quote('1', String(customer.id)),
    input = {
      ...f.cart('1', String(customer.id)),
      quoteFingerprint: q.quoteFingerprint,
      cashAppliedMinor: '0',
      cashReceivedMinor: '0',
    };
  const responses = await Promise.all(
    [1, 2].map(() =>
      f
        .api()
        .post(`${f.path}/sales`)
        .set(f.h)
        .send({ ...input, idempotencyKey: randomUUID() }),
    ),
  );
  expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  const sale = saleReceiptSchema.parse(responses.find((r) => r.status === 201)!.body);
  expect(sale.finance.reconciled).toBe(true);
  expect(sale.finance.outstandingMinor).toBe('1375');
  expect(sale.payments).toEqual([]);
  await f
    .api()
    .patch(`${f.path}/members/${f.viewerId}`)
    .set(f.h)
    .send({ role: 'cashier', state: 'active', version: 1 })
    .expect(200);
  await f
    .api()
    .post(`${f.path}/sales`)
    .set(native(f.viewerToken))
    .send({
      ...input,
      creditOverrideReason: 'Unauthorized limit override',
      idempotencyKey: randomUUID(),
    })
    .expect(403);
  expect(
    (await f.db().query('SELECT count(*) FROM sales WHERE business_id=$1', [f.a])).rows[0]!.count,
  ).toBe('1');
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
