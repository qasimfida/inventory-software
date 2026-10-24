import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { reportSchema, saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture(),
  today = new Date().toISOString().slice(0, 10);
it('reconciles current receivables through partial collection and a return without counting duplicates', async () => {
  const f = fixture(),
    customer = (
      await f
        .api()
        .post(`${f.path}/customers`)
        .set(f.h)
        .send({ storeId: f.storeA, code: 'AR-REPORT', name: 'Report customer', currency: 'USD' })
        .expect(201)
    ).body.id as string;
  await f
    .api()
    .patch(`${f.path}/customers/${customer}/credit`)
    .set(f.h)
    .send({
      creditEnabled: true,
      creditHold: false,
      creditLimitMinor: '10000',
      termsDays: 14,
      version: 1,
    })
    .expect(200);
  const quote = await f.quote('1', customer),
    sale = saleReceiptSchema.parse(
      (
        await f
          .api()
          .post(`${f.path}/sales`)
          .set(f.h)
          .send({
            ...f.cart('1', customer),
            quoteFingerprint: quote.quoteFingerprint,
            cashAppliedMinor: '500',
            cashReceivedMinor: '500',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  const outstanding = async () =>
    reportSchema
      .parse(
        (
          await f
            .api()
            .get(`${f.path}/reports`)
            .set(f.h)
            .query({ section: 'receivables', from: today, to: today })
            .expect(200)
        ).body,
      )
      .rows.find((r) => r.key === 'receivable:USD')?.value;
  expect(await outstanding()).toBe('875');
  const payment = {
    receivableId: sale.receivableId,
    amountMinor: '200',
    reference: 'REPORT-COLLECT',
    idempotencyKey: randomUUID(),
  };
  await f.api().post(`${f.path}/customers/${customer}/payments`).set(f.h).send(payment).expect(201);
  await f.api().post(`${f.path}/customers/${customer}/payments`).set(f.h).send(payment).expect(201);
  expect(await outstanding()).toBe('675');
  const returned = {
    kind: 'return',
    reasonCode: 'unwanted',
    note: 'Customer changed mind',
    lines: [{ saleLineId: sale.lines[0]!.id, quantity: '1', disposition: 'restock' }],
    idempotencyKey: randomUUID(),
  };
  await f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(returned).expect(201);
  expect(await outstanding()).toBe('0');
  const cash = reportSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/reports`)
        .set(f.h)
        .query({ section: 'payments', from: today, to: today })
        .expect(200)
    ).body,
  );
  expect(cash.rows.find((r) => r.key === 'cash-in:USD')?.value).toBe('700');
  expect(cash.rows.find((r) => r.key === 'cash-refunds:USD')?.value).toBe('700');
});
