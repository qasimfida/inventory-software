import { expect, it } from 'vitest';
import { reportSchema } from '@inventory/contracts';
import { purchasingFixture } from '../../test/purchasing-fixture.js';
const fixture = purchasingFixture(),
  today = new Date().toISOString().slice(0, 10);
it('reports posted supplier obligations and current payable balances, not order estimates', async () => {
  const f = fixture();
  for (const [section, key, expected] of [
    ['purchases', 'invoiced:USD', '1000'],
    ['payables', 'payable:USD', '1000'],
  ]) {
    const response = await f
      .api()
      .get(`${f.path}/reports`)
      .set(f.h)
      .query({ section, from: today, to: today })
      .expect(200);
    expect(reportSchema.parse(response.body).rows.find((r) => r.key === key)?.value).toBe(expected);
  }
  const response = await f
    .api()
    .get(`${f.path}/reports`)
    .set(f.h)
    .query({ section: 'receivables', from: today, to: today })
    .expect(200);
  expect(reportSchema.parse(response.body).rows).toEqual([]);
});
it('reconciles duplicate supplier cash settlements and credits with the payable subledger', async () => {
  const f = fixture();
  const payment = {
    kind: 'payment',
    amountMinor: '400',
    reference: 'REPORT-PAYMENT',
    idempotencyKey: crypto.randomUUID(),
  };
  await f.api().post(`${f.payablePath}/settlements`).set(f.h).send(payment).expect(201);
  await f.api().post(`${f.payablePath}/settlements`).set(f.h).send(payment).expect(201);
  const detail = await f
    .api()
    .post(f.returnPath)
    .set(f.h)
    .send({
      receiptId: f.data.receipts[0]!.id,
      quantity: '2',
      damaged: '0',
      reason: 'Accepted supplier return',
      creditReference: 'REPORT-CREDIT',
      idempotencyKey: crypto.randomUUID(),
    })
    .expect(201);
  await f
    .api()
    .post(`${f.payablePath}/credits`)
    .set(f.h)
    .send({
      returnId: detail.body.returns[0].id,
      amountMinor: '200',
      reference: 'REPORT-CREDIT',
      reason: 'Approved supplier credit',
      idempotencyKey: crypto.randomUUID(),
    })
    .expect(201);
  for (const [section, key, value] of [
    ['payments', 'supplier-payment:USD', '400'],
    ['purchases', 'credits:USD', '200'],
    ['payables', 'payable:USD', '400'],
  ]) {
    const result = reportSchema.parse(
      (
        await f
          .api()
          .get(`${f.path}/reports`)
          .set(f.h)
          .query({ section, from: today, to: today })
          .expect(200)
      ).body,
    );
    expect(result.rows.find((r) => r.key === key)?.value).toBe(value);
  }
});
