import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { reportSchema, saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture(),
  today = new Date().toISOString().slice(0, 10);
async function report(section: string, token?: string, extra: Record<string, string> = {}) {
  const f = fixture();
  return f
    .api()
    .get(`${f.path}/reports`)
    .query({ section, from: today, to: today, ...extra })
    .set(native(token ?? f.ownerToken));
}
it('reconciles sale/return/cash aggregates, preserves exact strings and movement closing stock', async () => {
  const f = fixture(),
    quote = await f.quote('2');
  const input = {
    ...f.cart('2'),
    quoteFingerprint: quote.quoteFingerprint,
    cashAppliedMinor: quote.totalMinor,
    cashReceivedMinor: quote.totalMinor,
    idempotencyKey: randomUUID(),
  };
  const sale = saleReceiptSchema.parse(
    (await f.api().post(`${f.path}/sales`).set(f.h).send(input).expect(201)).body,
  );
  await f.api().post(`${f.path}/sales`).set(f.h).send(input).expect(201);
  const returned = {
    kind: 'return',
    reasonCode: 'unwanted',
    note: 'Customer changed mind',
    lines: [{ saleLineId: sale.lines[0]!.id, quantity: '1', disposition: 'restock' }],
    idempotencyKey: randomUUID(),
  };
  await f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(returned).expect(201);
  await f.api().post(`${f.path}/sales/${sale.sale.id}/returns`).set(f.h).send(returned).expect(201);
  const sales = reportSchema.parse((await report('sales')).body);
  expect(sales.rows.find((r) => r.key === 'sales:USD')?.value).toBe('2750');
  expect(sales.rows.find((r) => r.key === 'returns:USD')?.value).toBe('1375');
  expect(sales.rows.find((r) => r.key === 'net:USD')?.value).toBe('1250');
  expect(sales.rows.find((r) => r.key === 'transactions')?.value).toBe('1');
  const payments = reportSchema.parse((await report('payments')).body);
  expect(payments.rows.find((r) => r.key === 'cash-in:USD')?.value).toBe('2750');
  expect(payments.rows.find((r) => r.key === 'cash-refunds:USD')?.value).toBe('1375');
  const movements = reportSchema.parse((await report('movements')).body);
  expect(movements.rows.find((r) => r.key.endsWith(':closing on hand'))?.value).toBe('9.000000');
  const stock = reportSchema.parse((await report('inventory')).body);
  expect(stock.rows.find((r) => r.key.endsWith(':on hand'))?.value).toBe('9.000000');
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
  expect(
    reportSchema.parse((await report('inventory', undefined, { lowOnly: 'true' })).body).rows,
  ).toEqual([]);
});
it('requires report and category permissions, validates dates, and applies current warehouse scope', async () => {
  const f = fixture();
  expect((await report('sales', f.otherToken)).status).toBe(404);
  expect((await report('sales', f.viewerToken)).status).toBe(403);
  expect((await report('sales', undefined, { from: '2026-02-30' })).status).toBe(400);
  expect((await report('sales', undefined, { from: '2020-01-01' })).status).toBe(400);
  await f
    .db()
    .query(
      "UPDATE business_memberships SET role='custom',permissions=ARRAY['reports.read','stock.read'],scope_store_id=$3,scope_warehouse_id=$4 WHERE business_id=$1 AND account_id=$2",
      [f.a, f.managerId, f.storeA, f.warehouseA],
    );
  expect((await report('sales', f.managerToken)).status).toBe(403);
  expect((await report('payments', f.managerToken)).status).toBe(403);
  expect((await report('inventory', f.managerToken)).status).toBe(200);
  const warehouse = (
    await f
      .api()
      .post(`${f.path}/locations`)
      .set(f.h)
      .send({ kind: 'warehouses', name: 'Other warehouse', code: 'OTHER', storeId: f.storeA })
      .expect(201)
  ).body.id as string;
  expect((await report('inventory', f.managerToken, { warehouseId: warehouse })).status).toBe(404);
  await f
    .api()
    .post(`${f.path}/stock/movements`)
    .set(f.h)
    .send({
      warehouseId: warehouse,
      variantId: f.variantId,
      unitId: f.unitId,
      quantity: '100',
      type: 'opening',
      reason: 'Other scoped warehouse stock',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const scoped = reportSchema.parse((await report('inventory', f.managerToken)).body);
  expect(scoped.rows.every((row) => !row.label.includes('Other warehouse'))).toBe(true);
  expect(scoped.rows).toHaveLength(5);
  expect(
    reportSchema
      .parse((await report('inventory', undefined, { warehouseId: warehouse })).body)
      .rows.find((r) => r.key.endsWith(':on hand'))?.value,
  ).toBe('100.000000');
  await f
    .api()
    .get(`${f.path}/reports`)
    .query({ section: 'sales', from: today, to: today })
    .expect(401);
});
