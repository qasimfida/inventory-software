import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
async function sell(quantity = '2', customerId: string | null = null, cash?: string) {
  const f = fixture(),
    q = await f.quote(quantity, customerId);
  return saleReceiptSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sales`)
        .set(f.h)
        .send({
          ...f.cart(quantity, customerId),
          quoteFingerprint: q.quoteFingerprint,
          cashAppliedMinor: cash ?? q.totalMinor,
          cashReceivedMinor: cash ?? q.totalMinor,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
}
it('returns partial quantities exactly once, preserves original money, prevents over-return and reconciles damaged/non-restockable stock', async () => {
  const f = fixture(),
    sale = await sell('3'),
    line = sale.lines[0]!;
  const input = {
    kind: 'return',
    reasonCode: 'defective',
    note: 'Damaged merchandise',
    lines: [{ saleLineId: line.id, quantity: '1', disposition: 'damaged' }],
    idempotencyKey: randomUUID(),
  };
  const [a, b] = await Promise.all([
    f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(input).expect(201),
    f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(input).expect(201),
  ]);
  expect(a.body).toEqual(b.body);
  expect(a.body.cashRefundMinor).toBe('1375');
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(native(f.viewerToken))
    .send({ ...input, idempotencyKey: randomUUID() })
    .expect(403);
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(native(f.otherToken))
    .send({ ...input, idempotencyKey: randomUUID() })
    .expect(404);
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(f.h)
    .send({ ...input, lines: [{ ...input.lines[0], quantity: '3' }], idempotencyKey: randomUUID() })
    .expect(409);
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(f.h)
    .send({
      ...input,
      kind: 'void',
      lines: [{ ...input.lines[0], quantity: '2' }],
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(f.h)
    .send({
      ...input,
      lines: [{ ...input.lines[0], quantity: '2', disposition: 'non_restockable' }],
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const receipt = saleReceiptSchema.parse(
    (await f.api().get(`${f.path}/sales/${sale.sale.id}/receipt`).set(f.h).expect(200)).body,
  );
  expect(receipt.sale.state).toBe('returned');
  expect(receipt.sale.totalMinor).toBe('4125');
  expect(receipt.finance.refunds.reduce((n, r) => n + BigInt(r.amountMinor), 0n)).toBe(4125n);
  const balance = (
    await f
      .db()
      .query(
        'SELECT on_hand::text,damaged::text FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2',
        [f.a, f.warehouseA],
      )
  ).rows[0];
  expect(balance).toMatchObject({ on_hand: '8.000000', damaged: '1.000000' });
  await expect(f.db().query('DELETE FROM sale_returns WHERE id=$1', [a.body.id])).rejects.toThrow();
  await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200);
});
it('credits unpaid receivables first, refunds partial collections and blocks double refunds', async () => {
  const f = fixture(),
    c = (
      await f
        .api()
        .post(`${f.path}/customers`)
        .set(f.h)
        .send({ storeId: f.storeA, code: 'RET-CREDIT', name: 'Credit return', currency: 'USD' })
        .expect(201)
    ).body;
  await f
    .api()
    .patch(`${f.path}/customers/${c.id}/credit`)
    .set(f.h)
    .send({
      creditEnabled: true,
      creditHold: false,
      creditLimitMinor: '10000',
      termsDays: 10,
      version: 1,
    })
    .expect(200);
  const sale = await sell('2', String(c.id), '500');
  await f
    .api()
    .post(`${f.path}/customers/${c.id}/payments`)
    .set(f.h)
    .send({
      receivableId: sale.receivableId,
      amountMinor: '250',
      reference: 'Partial collection',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const returned = (
    await f
      .api()
      .post(`${f.path}/sales/${sale.sale.id}/returns`)
      .set(f.h)
      .send({
        kind: 'return',
        reasonCode: 'unwanted',
        note: 'Return whole purchase',
        lines: [{ saleLineId: sale.lines[0]!.id, quantity: '2', disposition: 'restock' }],
        idempotencyKey: randomUUID(),
      })
      .expect(201)
  ).body;
  expect(returned).toMatchObject({
    totalMinor: '2750',
    creditMinor: '2000',
    cashRefundMinor: '750',
  });
  const receipt = saleReceiptSchema.parse(
    (await f.api().get(`${f.path}/sales/${sale.sale.id}/receipt`).set(f.h).expect(200)).body,
  );
  expect(receipt.finance.outstandingMinor).toBe('0');
  expect(receipt.finance.refunds).toHaveLength(2);
  await f
    .api()
    .post(`${f.path}/customers/${c.id}/payments`)
    .set(f.h)
    .send({
      receivableId: sale.receivableId,
      amountMinor: '1',
      reference: 'Overpayment',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
});
