import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { payableDetailSchema, payablePageSchema, purchaseDetailSchema } from '@inventory/contracts';
import { purchasingFixture } from '../../test/purchasing-fixture.js';
const fixture = purchasingFixture();
it('settles partial invoices, credits mixed-condition returns and refunds supplier overpayments exactly once', async () => {
  const f = fixture();
  const read = async () =>
    payableDetailSchema.parse((await f.api().get(f.payablePath).set(f.h).expect(200)).body);
  expect((await read()).invoice.outstandingMinor).toBe('1000');
  const payment = {
    kind: 'payment',
    amountMinor: '400',
    reference: 'SUP-CASH-1',
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.all(
    [0, 1].map(() =>
      f.api().post(`${f.payablePath}/settlements`).set(f.h).send(payment).expect(201),
    ),
  );
  expect(results[0]!.body).toEqual(results[1]!.body);
  await f
    .api()
    .post(`${f.payablePath}/settlements`)
    .set(f.h)
    .send({ ...payment, amountMinor: '401' })
    .expect(409);
  await f
    .api()
    .post(`${f.payablePath}/settlements`)
    .set(f.h)
    .send({ ...payment, idempotencyKey: randomUUID() })
    .expect(409);
  expect((await read()).invoice.outstandingMinor).toBe('600');
  const returned = {
    receiptId: f.data.receipts[0]!.id,
    quantity: '8',
    damaged: '2',
    reason: 'Supplier accepted goods back',
    creditReference: 'CREDIT-800',
    idempotencyKey: randomUUID(),
  };
  const detail = purchaseDetailSchema.parse(
    (await f.api().post(f.returnPath).set(f.h).send(returned).expect(201)).body,
  );
  expect((await f.api().post(f.returnPath).set(f.h).send(returned).expect(201)).body).toEqual(
    detail,
  );
  const credit = {
    returnId: detail.returns[0]!.id,
    amountMinor: '800',
    reference: 'CREDIT-800',
    reason: 'Confirmed credit note',
    idempotencyKey: randomUUID(),
  };
  const first = await f.api().post(`${f.payablePath}/credits`).set(f.h).send(credit).expect(201);
  expect(
    (await f.api().post(`${f.payablePath}/credits`).set(f.h).send(credit).expect(201)).body,
  ).toEqual(first.body);
  await f
    .api()
    .post(`${f.payablePath}/credits`)
    .set(f.h)
    .send({ ...credit, amountMinor: '1', reference: 'DUPLICATE', idempotencyKey: randomUUID() })
    .expect(409);
  expect((await read()).invoice.outstandingMinor).toBe('-200');
  const page = payablePageSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/payables?warehouseId=${f.warehouseA}&supplierId=${f.data.order.supplierId}`)
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(page.totals).toEqual([{ currency: 'USD', payableMinor: '0', supplierOwesMinor: '200' }]);
  const refund = {
    kind: 'refund',
    amountMinor: '200',
    reference: 'SUP-REFUND-1',
    idempotencyKey: randomUUID(),
  };
  await f
    .api()
    .post(`${f.payablePath}/settlements`)
    .set(f.h)
    .send({ ...refund, amountMinor: '201' })
    .expect(409);
  await f.api().post(`${f.payablePath}/settlements`).set(f.h).send(refund).expect(201);
  await f.api().post(`${f.payablePath}/settlements`).set(f.h).send(refund).expect(201);
  const final = await read();
  expect(final.invoice).toMatchObject({
    outstandingMinor: '0',
    paidMinor: '400',
    refundedMinor: '200',
    creditMinor: '800',
  });
  expect(final.events).toHaveLength(3);
  expect(final.events.every((e) => e.actorId === f.ownerId && e.createdAt)).toBe(true);
  const shift = (
    await f.api().get(`${f.path}/cash-shifts?warehouseId=${f.warehouseA}`).set(f.h).expect(200)
  ).body.shifts[0];
  expect(shift.expectedMinor).toBe('9800');
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
  for (const table of ['supplier_credits', 'supplier_settlements'])
    await expect(f.db().query(`DELETE FROM ${table} WHERE business_id=$1`, [f.a])).rejects.toThrow(
      'append-only',
    );
});
it('retains balances independently of pagination and rejects unpaid invoice over-credit and unauthenticated access', async () => {
  const f = fixture();
  await f.api().get(f.payablePath).expect(401);
  const page = payablePageSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/payables?warehouseId=${f.warehouseA}&offset=25`)
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(page.invoices).toEqual([]);
  expect(page.totals).toEqual([{ currency: 'USD', payableMinor: '0', supplierOwesMinor: '0' }]);
  await f
    .api()
    .post(`${f.payablePath}/credits`)
    .set(f.h)
    .send({
      returnId: randomUUID(),
      amountMinor: '1001',
      reference: 'EXCESS',
      reason: 'Rejected excessive credit',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
});
