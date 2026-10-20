import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('allocates original net and tax rounding residuals cumulatively and serializes competing returns', async () => {
  const f = fixture();
  await f
    .api()
    .post(`${f.path}/prices`)
    .set(f.h)
    .send({
      variantId: f.variantId,
      unitPrice: '0.05',
      currency: 'USD',
      taxBasisPoints: 1000,
      taxInclusive: false,
      startsAt: '2026-02-01T00:00:00.000Z',
    })
    .expect(201);
  const q = await f.quote('3');
  expect(q.totalMinor).toBe('17');
  const sale = saleReceiptSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sales`)
        .set(f.h)
        .send({
          ...f.cart('3'),
          quoteFingerprint: q.quoteFingerprint,
          cashAppliedMinor: '17',
          cashReceivedMinor: '17',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const input = {
    kind: 'return',
    reasonCode: 'unwanted',
    note: 'Fractional tax allocation',
    lines: [{ saleLineId: sale.lines[0]!.id, quantity: '1', disposition: 'restock' }],
  };
  const totals = [];
  for (let n = 0; n < 3; n++)
    totals.push(
      (
        await f
          .api()
          .post(`${f.path}/sales/${sale.sale.id}/returns`)
          .set(f.h)
          .send({ ...input, idempotencyKey: randomUUID() })
          .expect(201)
      ).body.totalMinor,
    );
  expect(totals).toEqual(['6', '5', '6']);
  const q2 = await f.quote('3');
  const next = saleReceiptSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sales`)
        .set(f.h)
        .send({
          ...f.cart('3'),
          quoteFingerprint: q2.quoteFingerprint,
          cashAppliedMinor: '17',
          cashReceivedMinor: '17',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const race = await Promise.all(
    [1, 2].map(() =>
      f
        .api()
        .post(`${f.path}/sales/${next.sale.id}/returns`)
        .set(f.h)
        .send({
          ...input,
          lines: [{ saleLineId: next.lines[0]!.id, quantity: '2', disposition: 'restock' }],
          idempotencyKey: randomUUID(),
        }),
    ),
  );
  expect(race.map((x) => x.status).sort()).toEqual([201, 409]);
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
