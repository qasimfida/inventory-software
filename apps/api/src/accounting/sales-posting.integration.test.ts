import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { accountingPageSchema, saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('reconciles cash, revenue, tax and returns without counting settlement as revenue', async () => {
  const f = fixture(),
    quote = await f.quote('2'),
    path = `${f.path}/accounting`,
    today = new Date().toISOString().slice(0, 10);
  const sale = saleReceiptSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sales`)
        .set(f.h)
        .send({
          ...f.cart('2'),
          quoteFingerprint: quote.quoteFingerprint,
          cashAppliedMinor: quote.totalMinor,
          cashReceivedMinor: quote.totalMinor,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(f.h)
    .send({
      kind: 'return',
      reasonCode: 'unwanted',
      note: 'Customer returned one',
      lines: [{ saleLineId: sale.lines[0]!.id, quantity: '1', disposition: 'restock' }],
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  await f
    .api()
    .post(`${path}/periods`)
    .set(f.h)
    .send({ from: today, to: today, idempotencyKey: randomUUID() })
    .expect(201);
  const pending = accountingPageSchema.parse((await f.api().get(path).set(f.h).expect(200)).body);
  expect(pending.pending).toHaveLength(4);
  for (const source of pending.pending)
    await f
      .api()
      .post(`${path}/sources`)
      .set(f.h)
      .send({ kind: source.kind, sourceId: source.id, idempotencyKey: randomUUID() })
      .expect(201);
  const data = accountingPageSchema.parse((await f.api().get(path).set(f.h).expect(200)).body);
  const net = (account: string) => {
    const b = data.balances.find((b) => b.account === account)!;
    return BigInt(b.debit) - BigInt(b.credit);
  };
  expect(net('1000')).toBe(1375n);
  expect(net('1100')).toBe(0n);
  expect(net('4000') + net('4100')).toBe(-1250n);
  expect(net('2100')).toBe(-125n);
  expect(data.pending).toEqual([]);
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
