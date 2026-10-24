import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { dashboardSchema, saleReceiptSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
const overview = (token?: string, query = {}) => {
  const f = fixture();
  return f
    .api()
    .get(`${f.path}/reports/overview`)
    .query(query)
    .set(native(token ?? f.ownerToken));
};
it('reconciles bounded dashboard totals, trend and top products without mixing currencies', async () => {
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
  const data = dashboardSchema.parse((await overview().expect(200)).body);
  expect(data.currency).toBe('USD');
  expect(data.sales?.todayMinor).toBe('2750');
  expect(data.sales?.todayOrders).toBe('1');
  expect(data.sales?.averageBasketMinor).toBe('2750');
  expect(data.sales?.trend).toHaveLength(30);
  expect(data.sales?.trend.reduce((n, p) => n + BigInt(p.totalMinor), 0n).toString()).toBe(
    data.sales?.periodMinor,
  );
  expect(data.sales?.topProducts[0]?.totalMinor).toBe('2750');
  expect(data.sales?.recent[0]?.id).toBe(sale.sale.id);
  expect(data.inventory?.items[0]?.available).toBe('8.000000');
  const pkr = dashboardSchema.parse(
    (await overview(undefined, { currency: 'PKR', days: 7 }).expect(200)).body,
  );
  expect(pkr.sales?.todayMinor).toBe('0');
  expect(pkr.sales?.recent).toEqual([]);
  expect(pkr.sales?.trend).toHaveLength(7);
  await f
    .api()
    .post(`${f.path}/sales/${sale.sale.id}/returns`)
    .set(f.h)
    .send({
      kind: 'return',
      reasonCode: 'unwanted',
      note: 'Dashboard return reconciliation',
      lines: [{ saleLineId: sale.lines[0]!.id, quantity: '1', disposition: 'restock' }],
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const after = dashboardSchema.parse((await overview().expect(200)).body);
  expect(after.sales?.todayMinor).toBe('2750');
  expect(after.sales?.recent[0]?.state).toBe('partially_returned');
  expect(after.inventory?.items[0]?.available).toBe('9.000000');
});
it('rejects unauthorized, cross-tenant and malformed requests; honors category and location scope', async () => {
  const f = fixture();
  await f.api().get(`${f.path}/reports/overview`).expect(401);
  await overview(f.otherToken).expect(404);
  await overview(f.viewerToken).expect(403);
  await overview(undefined, { currency: 'INVALID' }).expect(400);
  await overview(undefined, { days: 366 }).expect(400);
  await overview(undefined, { warehouseId: f.warehouseA }).expect(400);
  await f
    .db()
    .query(
      "UPDATE business_memberships SET role='custom',permissions=ARRAY['reports.read','stock.read'],scope_store_id=$3,scope_warehouse_id=$4 WHERE business_id=$1 AND account_id=$2",
      [f.a, f.managerId, f.storeA, f.warehouseA],
    );
  const scoped = dashboardSchema.parse((await overview(f.managerToken).expect(200)).body);
  expect(scoped.sales).toBeNull();
  expect(scoped.inventory?.items[0]?.available).toBe('9.000000');
  const warehouse = (
    await f
      .api()
      .post(`${f.path}/locations`)
      .set(f.h)
      .send({
        kind: 'warehouses',
        name: 'Scoped empty warehouse',
        code: 'EMPTY',
        storeId: f.storeA,
      })
      .expect(201)
  ).body.id as string;
  await f
    .db()
    .query(
      "UPDATE business_memberships SET permissions=ARRAY['reports.read','sales.read'],scope_store_id=$3,scope_warehouse_id=$4 WHERE business_id=$1 AND account_id=$2",
      [f.a, f.managerId, f.storeA, warehouse],
    );
  const otherScope = dashboardSchema.parse((await overview(f.managerToken).expect(200)).body);
  expect(otherScope.inventory).toBeNull();
  expect(otherScope.sales?.todayMinor).toBe('0');
});
