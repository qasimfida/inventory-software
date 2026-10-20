import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { transferDetailSchema, locationSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { transferFixture } from '../../test/transfer-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = transferFixture();
it('cancels reservations atomically and serializes competing transfer approvals and sales', async () => {
  const { api, path, h, create, warehouseA, variantId, unitId } = fixture();
  let data = await create('5', 'CANCEL');
  const id = data.transfer.id;
  data = transferDetailSchema.parse(
    (
      await api()
        .post(`${path}/transfers/${id}/transitions`)
        .set(h)
        .send({
          action: 'approve',
          version: 1,
          reason: 'Reserve stock',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const cancel = {
    action: 'cancel',
    version: data.transfer.version,
    reason: 'No longer needed',
    idempotencyKey: randomUUID(),
  };
  await api().post(`${path}/transfers/${id}/transitions`).set(h).send(cancel).expect(201);
  await api().post(`${path}/transfers/${id}/transitions`).set(h).send(cancel).expect(201);
  const after = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(after.balances[0]).toMatchObject({ onHand: '20.000000', reserved: '0.000000' });
  data = await create('15', 'COMPETE');
  const results = await Promise.all([
    api().post(`${path}/transfers/${data.transfer.id}/transitions`).set(h).send({
      action: 'approve',
      version: 1,
      reason: 'Competing reservation',
      idempotencyKey: randomUUID(),
    }),
    api().post(`${path}/stock/movements`).set(h).send({
      warehouseId: warehouseA,
      variantId,
      unitId,
      type: 'sale',
      quantity: '15',
      reason: 'Competing sale',
      idempotencyKey: randomUUID(),
    }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(
    (await api().get(`${path}/warehouses/${warehouseA}/reconciliation`).set(h).expect(200)).body
      .consistent,
  ).toBe(true);
});
it('rejects inter-business destinations and rolls back a receipt when the destination write fails', async () => {
  const {
    api,
    path,
    h,
    create,
    root,
    b,
    otherToken,
    storeB,
    warehouseA,
    variantId,
    unitId,
    db,
    destinationId,
  } = fixture();
  const foreign = locationSchema.parse(
    (
      await api()
        .post(`${root}/${b}/locations`)
        .set(native(otherToken))
        .send({ kind: 'warehouses', name: 'Foreign', code: 'FOREIGN', storeId: storeB })
        .expect(201)
    ).body,
  );
  await api()
    .post(`${path}/transfers`)
    .set(h)
    .send({
      sourceWarehouseId: warehouseA,
      destinationWarehouseId: foreign.id,
      reference: 'CROSS',
      lines: [{ variantId, unitId, quantity: '1' }],
      idempotencyKey: randomUUID(),
    })
    .expect(404);
  let data = await create('1', 'ROLLBACK');
  for (const action of ['approve', 'dispatch'])
    data = transferDetailSchema.parse(
      (
        await api()
          .post(`${path}/transfers/${data.transfer.id}/transitions`)
          .set(h)
          .send({
            action,
            version: data.transfer.version,
            reason: 'One unit shipment',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  await db().query(
    `CREATE FUNCTION fail_destination() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.warehouse_id='${destinationId}'::uuid THEN RAISE EXCEPTION 'Injected failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_destination BEFORE UPDATE ON stock_balances FOR EACH ROW EXECUTE FUNCTION fail_destination()`,
  );
  const receipt = {
    lineId: data.lines[0]!.id,
    received: '1',
    reason: 'Arrival inspection',
    idempotencyKey: randomUUID(),
  };
  await api()
    .post(`${path}/transfers/${data.transfer.id}/receipts`)
    .set(h)
    .send(receipt)
    .expect(500);
  await db().query(
    'DROP TRIGGER fail_destination ON stock_balances; DROP FUNCTION fail_destination()',
  );
  const failed = transferDetailSchema.parse(
    (await api().get(`${path}/transfers/${data.transfer.id}`).set(h).expect(200)).body,
  );
  expect(failed.receipts).toHaveLength(0);
  expect(failed.lines[0]!.settled).toBe('0.000000');
  await api()
    .post(`${path}/transfers/${data.transfer.id}/receipts`)
    .set(h)
    .send(receipt)
    .expect(201);
  for (const warehouse of [warehouseA, destinationId])
    expect(
      (await api().get(`${path}/warehouses/${warehouse}/reconciliation`).set(h).expect(200)).body
        .consistent,
    ).toBe(true);
});
