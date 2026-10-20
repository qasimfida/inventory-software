import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
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
it('links exchange refunds to one replacement, supports full authorized void, and rolls back when a cash refund fails', async () => {
  const f = fixture(),
    sale = await sell('1');
  const input = {
    kind: 'exchange',
    reasonCode: 'incorrect',
    note: 'Exchange original purchase',
    lines: [{ saleLineId: sale.lines[0]!.id, quantity: '1', disposition: 'restock' }],
    idempotencyKey: randomUUID(),
  };
  await f
    .db()
    .query(
      "CREATE FUNCTION fail_refund() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced refund failure'; END; $$; CREATE TRIGGER fail_refund BEFORE INSERT ON cash_refunds FOR EACH ROW EXECUTE FUNCTION fail_refund();",
    );
  await f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(input).expect(500);
  expect(
    (await f.db().query('SELECT id FROM sale_returns WHERE sale_id=$1', [sale.sale.id])).rowCount,
  ).toBe(0);
  await f.db().query('DROP TRIGGER fail_refund ON cash_refunds; DROP FUNCTION fail_refund();');
  const ret = (
    await f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(input).expect(201)
  ).body;
  const q = await f.quote(),
    replacement = {
      ...f.cart(),
      quoteFingerprint: q.quoteFingerprint,
      cashAppliedMinor: q.totalMinor,
      cashReceivedMinor: q.totalMinor,
      exchangeReturnId: ret.id,
      idempotencyKey: randomUUID(),
    };
  const next = saleReceiptSchema.parse(
    (await f.api().post(`${f.path}/sales`).set(f.h).send(replacement).expect(201)).body,
  );
  await f
    .api()
    .post(`${f.path}/sales`)
    .set(f.h)
    .send({ ...replacement, idempotencyKey: randomUUID() })
    .expect(409);
  const v = {
    kind: 'void',
    reasonCode: 'cancellation',
    note: 'Authorized cancellation',
    lines: [{ saleLineId: next.lines[0]!.id, quantity: '1', disposition: 'restock' }],
    idempotencyKey: randomUUID(),
  };
  await f.api().post(`${f.path}/sales/${next.sale.id}/returns`).set(f.h).send(v).expect(201);
  expect(
    saleReceiptSchema.parse(
      (await f.api().get(`${f.path}/sales/${next.sale.id}/receipt`).set(f.h).expect(200)).body,
    ).sale.state,
  ).toBe('voided');
});
