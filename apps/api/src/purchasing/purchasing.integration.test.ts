import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { purchaseDetailSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('receives partial orders exactly once, returns only received goods and preserves cancellation history', async () => {
  const { api, root, a, ownerToken, viewerToken, otherToken, variantId, unitId, warehouseA } =
      fixture(),
    path = `${root}/${a}`,
    headers = native(ownerToken);
  const supplier = await api()
    .post(`${path}/suppliers`)
    .set(headers)
    .send({ name: 'Supplier A', code: 'SUP' })
    .expect(201);
  const supplierId = String(supplier.body.id);
  const input = {
    supplierId,
    warehouseId: warehouseA,
    reference: 'PO-001',
    currency: 'PKR',
    lines: [{ variantId, unitId, quantity: '10', unitCost: '12.50' }],
    idempotencyKey: randomUUID(),
  };
  let data = purchaseDetailSchema.parse(
    (await api().post(`${path}/purchases`).set(headers).send(input).expect(201)).body,
  );
  expect(
    purchaseDetailSchema.parse(
      (await api().post(`${path}/purchases`).set(headers).send(input).expect(201)).body,
    ),
  ).toEqual(data);
  const id = data.order.id,
    lineId = data.lines[0]!.id;
  await api().get(`${path}/purchases/${id}`).set(native(otherToken)).expect(404);
  await api().get(`${path}/purchases/${id}`).set(native(viewerToken)).expect(403);
  await api()
    .post(`${path}/purchases/${id}/receipts`)
    .set(headers)
    .send({ lineId, quantity: '1', idempotencyKey: randomUUID() })
    .expect(409);
  for (const action of ['approve', 'order'])
    data = purchaseDetailSchema.parse(
      (
        await api()
          .post(`${path}/purchases/${id}/transitions`)
          .set(headers)
          .send({
            action,
            version: data.order.version,
            reason: 'Approved supply',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  const receive = { lineId, quantity: '4', idempotencyKey: randomUUID() };
  const replies = await Promise.all([
    api().post(`${path}/purchases/${id}/receipts`).set(headers).send(receive).expect(201),
    api().post(`${path}/purchases/${id}/receipts`).set(headers).send(receive).expect(201),
  ]);
  expect(replies[0].body).toEqual(replies[1].body);
  data = purchaseDetailSchema.parse(replies[0].body);
  expect(data.order.state).toBe('partially_received');
  expect(data.lines[0]!.received).toBe('4.000000');
  expect(data.receipts).toHaveLength(1);
  await api()
    .post(`${path}/purchases/${id}/receipts`)
    .set(headers)
    .send({ ...receive, quantity: '7', idempotencyKey: randomUUID() })
    .expect(409);
  const returned = {
    receiptId: data.receipts[0]!.id,
    quantity: '1',
    reason: 'Damaged packaging',
    creditReference: 'CR-001',
    idempotencyKey: randomUUID(),
  };
  await api().post(`${path}/purchases/${id}/returns`).set(headers).send(returned).expect(201);
  await api().post(`${path}/purchases/${id}/returns`).set(headers).send(returned).expect(201);
  await api()
    .post(`${path}/purchases/${id}/returns`)
    .set(headers)
    .send({ ...returned, quantity: '4', idempotencyKey: randomUUID() })
    .expect(409);
  data = purchaseDetailSchema.parse(
    (
      await api()
        .post(`${path}/purchases/${id}/invoices`)
        .set(headers)
        .send({
          reference: 'INV-001',
          amountMinor: '5000',
          dueDate: '2026-12-31',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  data = purchaseDetailSchema.parse(
    (
      await api()
        .post(`${path}/purchases/${id}/transitions`)
        .set(headers)
        .send({
          action: 'cancel',
          version: data.order.version,
          reason: 'Close backorder',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  expect(data.order.state).toBe('cancelled');
  expect(data.lines[0]!.received).toBe('4.000000');
  expect(data.lines[0]!.unitCost).toBe('12.500000');
  expect(data.invoices).toHaveLength(1);
  await api()
    .post(`${path}/purchases/${id}/receipts`)
    .set(headers)
    .send({ ...receive, idempotencyKey: randomUUID() })
    .expect(409);
  const stock = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(headers).expect(200)).body,
  );
  expect(stock.balances[0]!.onHand).toBe('3.000000');
  expect(
    (await api().get(`${path}/warehouses/${warehouseA}/reconciliation`).set(headers).expect(200))
      .body.consistent,
  ).toBe(true);
});
it('locks line additions on approval and completes all remaining quantities', async () => {
  const { api, root, a, ownerToken, variantId, unitId, warehouseA } = fixture(),
    path = `${root}/${a}`,
    headers = native(ownerToken);
  const supplier = await api()
    .post(`${path}/suppliers`)
    .set(headers)
    .send({ name: 'Supplier B', code: 'SUP2' })
    .expect(201);
  const item = { variantId, unitId, quantity: '2', unitCost: '0.125' };
  let data = purchaseDetailSchema.parse(
    (
      await api()
        .post(`${path}/purchases`)
        .set(headers)
        .send({
          supplierId: supplier.body.id,
          warehouseId: warehouseA,
          reference: 'PO-002',
          currency: 'KWD',
          lines: [item],
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const id = data.order.id;
  data = purchaseDetailSchema.parse(
    (
      await api()
        .post(`${path}/purchases/${id}/lines`)
        .set(headers)
        .send({ ...item, version: data.order.version, idempotencyKey: randomUUID() })
        .expect(201)
    ).body,
  );
  expect(data.lines).toHaveLength(2);
  for (const action of ['approve', 'order'])
    data = purchaseDetailSchema.parse(
      (
        await api()
          .post(`${path}/purchases/${id}/transitions`)
          .set(headers)
          .send({
            action,
            version: data.order.version,
            reason: 'Approved supply',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  await api()
    .post(`${path}/purchases/${id}/lines`)
    .set(headers)
    .send({ ...item, version: data.order.version, idempotencyKey: randomUUID() })
    .expect(409);
  for (const line of data.lines)
    data = purchaseDetailSchema.parse(
      (
        await api()
          .post(`${path}/purchases/${id}/receipts`)
          .set(headers)
          .send({ lineId: line.id, quantity: '2', idempotencyKey: randomUUID() })
          .expect(201)
      ).body,
    );
  expect(data.order.state).toBe('completed');
});
