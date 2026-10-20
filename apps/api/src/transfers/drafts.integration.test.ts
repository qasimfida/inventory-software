import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { productSchema, transferDetailSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { transferFixture } from '../../test/transfer-fixture.js';
const fixture = transferFixture();
it('supports multiple draft lines, rejects duplicate variants and protects approved quantities', async () => {
  const { api, path, h, create, warehouseA, unitId, db, a } = fixture();
  const variantId = productSchema.parse(
    (
      await api()
        .post(`${path}/products`)
        .set(h)
        .send({ name: 'Second transfer item', sku: 'SECOND' })
        .expect(201)
    ).body,
  ).id;
  await api()
    .post(`${path}/stock/movements`)
    .set(h)
    .send({
      variantId,
      unitId,
      warehouseId: warehouseA,
      type: 'opening',
      quantity: '3',
      reason: 'Second opening',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  let data = await create('2', 'MULTILINE');
  const id = data.transfer.id;
  const line = { variantId, unitId, quantity: '1', version: 1, idempotencyKey: randomUUID() };
  data = transferDetailSchema.parse(
    (await api().post(`${path}/transfers/${id}/lines`).set(h).send(line).expect(201)).body,
  );
  expect(data.lines).toHaveLength(2);
  await api()
    .post(`${path}/transfers/${id}/lines`)
    .set(h)
    .send({ ...line, version: data.transfer.version, idempotencyKey: randomUUID() })
    .expect(409);
  data = transferDetailSchema.parse(
    (
      await api()
        .post(`${path}/transfers/${id}/transitions`)
        .set(h)
        .send({
          action: 'approve',
          version: data.transfer.version,
          reason: 'Two item approval',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  await expect(
    db().query(
      'UPDATE transfer_lines SET base_quantity=100 WHERE business_id=$1 AND transfer_id=$2',
      [a, id],
    ),
  ).rejects.toMatchObject({ code: '23514' });
  await api()
    .post(`${path}/transfers/${id}/lines`)
    .set(h)
    .send({ ...line, version: data.transfer.version, idempotencyKey: randomUUID() })
    .expect(409);
  await api()
    .post(`${path}/transfers/${id}/transitions`)
    .set(h)
    .send({
      action: 'cancel',
      version: data.transfer.version,
      reason: 'Cancel both holds',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const stock = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(stock.balances.every((b) => b.reserved === '0.000000')).toBe(true);
  expect(
    (await api().get(`${path}/warehouses/${warehouseA}/reconciliation`).set(h).expect(200)).body
      .consistent,
  ).toBe(true);
});
