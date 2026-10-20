import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  saleReceiptSchema,
  stockWorkspaceSchema,
  customerStatementSchema,
} from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
it('revalidates totals, records cash change and commits one sale for concurrent duplicate submissions', async () => {
  const { api, path, h, quote, cart, warehouseA, otherToken } = fixture(),
    preview = await quote('2');
  expect(preview.totalMinor).toBe('2750');
  expect(preview.taxMinor).toBe('250');
  const input = {
    ...cart('2'),
    quoteFingerprint: preview.quoteFingerprint,
    cashAppliedMinor: '2750',
    cashReceivedMinor: '3000',
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.all([
    api().post(`${path}/sales`).set(h).send(input).expect(201),
    api().post(`${path}/sales`).set(h).send(input).expect(201),
  ]);
  expect(results[0].body).toEqual(results[1].body);
  const receipt = saleReceiptSchema.parse(results[0].body);
  expect(receipt.sale.changeMinor).toBe('250');
  expect(receipt.payments[0]!.amountMinor).toBe('2750');
  expect(receipt.lines[0]!.movementId).toBeTruthy();
  await api().get(`${path}/sales/${receipt.sale.id}/receipt`).set(native(otherToken)).expect(404);
  const stock = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(stock.balances[0]!.onHand).toBe('8.000000');
});
it('prevents stale-price acceptance, forged totals and competing overselling', async () => {
  const { api, path, h, quote, cart } = fixture(),
    preview = await quote('6');
  const input = {
    ...cart('6'),
    quoteFingerprint: preview.quoteFingerprint,
    cashAppliedMinor: preview.totalMinor,
    cashReceivedMinor: preview.totalMinor,
    idempotencyKey: randomUUID(),
  };
  await api()
    .post(`${path}/sales`)
    .set(h)
    .send({ ...input, totalMinor: '1' })
    .expect(400);
  await api()
    .post(`${path}/sales`)
    .set(h)
    .send({ ...input, quoteFingerprint: '0'.repeat(64) })
    .expect(409);
  const results = await Promise.all([
    api().post(`${path}/sales`).set(h).send(input),
    api()
      .post(`${path}/sales`)
      .set(h)
      .send({ ...input, idempotencyKey: randomUUID() }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
});
it('records partial cash plus a due-dated receivable and rolls everything back when credit is refused', async () => {
  const { api, path, h, quote, cart, storeA, db, a, warehouseA } = fixture();
  const customerId = String(
    (
      await api()
        .post(`${path}/customers`)
        .set(h)
        .send({ storeId: storeA, code: 'POS-CREDIT', name: 'POS customer', currency: 'USD' })
        .expect(201)
    ).body.id,
  );
  const preview = await quote('1', customerId),
    input = {
      ...cart('1', customerId),
      quoteFingerprint: preview.quoteFingerprint,
      cashAppliedMinor: '500',
      cashReceivedMinor: '500',
      idempotencyKey: randomUUID(),
    };
  const before = (await db().query('SELECT count(*) FROM sales WHERE business_id=$1', [a])).rows[0]!
    .count;
  await api().post(`${path}/sales`).set(h).send(input).expect(409);
  expect(
    (await db().query('SELECT count(*) FROM sales WHERE business_id=$1', [a])).rows[0]!.count,
  ).toBe(before);
  await api()
    .patch(`${path}/customers/${customerId}/credit`)
    .set(h)
    .send({
      creditEnabled: true,
      creditHold: false,
      creditLimitMinor: '10000',
      termsDays: 14,
      version: 1,
    })
    .expect(200);
  const receipt = saleReceiptSchema.parse(
    (await api().post(`${path}/sales`).set(h).send(input).expect(201)).body,
  );
  expect(receipt.receivableId).toBeTruthy();
  const statement = customerStatementSchema.parse(
    (await api().get(`${path}/customers/${customerId}/statement`).set(h).expect(200)).body,
  );
  expect(statement.outstandingMinor).toBe('875');
  expect(statement.receivables[0]!.saleId).toBe(receipt.sale.id);
  expect(
    (await api().get(`${path}/warehouses/${warehouseA}/reconciliation`).set(h).expect(200)).body
      .consistent,
  ).toBe(true);
});
it('rejects unsupported payment methods and leaves no records after a forced payment failure', async () => {
  const { api, path, h, quote, cart, db, a } = fixture(),
    preview = await quote('1'),
    input = {
      ...cart('1'),
      quoteFingerprint: preview.quoteFingerprint,
      cashAppliedMinor: preview.totalMinor,
      cashReceivedMinor: preview.totalMinor,
      idempotencyKey: randomUUID(),
    };
  await api()
    .post(`${path}/sales`)
    .set(h)
    .send({ ...input, paymentMethod: 'card' })
    .expect(400);
  await db().query(
    `CREATE FUNCTION reject_cash_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected recording failure'; END; $$; CREATE TRIGGER reject_cash_test BEFORE INSERT ON cash_payments FOR EACH ROW EXECUTE FUNCTION reject_cash_test()`,
  );
  const before = (
    await db().query('SELECT count(*) FROM stock_movements WHERE business_id=$1', [a])
  ).rows[0]!.count;
  await api().post(`${path}/sales`).set(h).send(input).expect(500);
  expect(
    (await db().query('SELECT count(*) FROM stock_movements WHERE business_id=$1', [a])).rows[0]!
      .count,
  ).toBe(before);
  await db().query(
    'DROP TRIGGER reject_cash_test ON cash_payments;DROP FUNCTION reject_cash_test()',
  );
  await api().post(`${path}/sales`).set(h).send(input).expect(201);
});
