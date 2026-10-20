import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { transferDetailSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { transferFixture } from '../../test/transfer-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = transferFixture();
it('reserves, dispatches, partially receives and records explicit damage/loss without manufacturing stock', async () => {
  const { api, path, h, create, warehouseA, destinationId, otherToken, viewerToken, db, a } =
    fixture();
  let data = await create('10', 'TR-001');
  const id = data.transfer.id;
  await api().get(`${path}/transfers/${id}`).set(native(otherToken)).expect(404);
  await api()
    .post(`${path}/transfers/${id}/transitions`)
    .set(native(viewerToken))
    .send({ action: 'approve', version: 1, reason: 'Approved', idempotencyKey: randomUUID() })
    .expect(403);
  const approve = {
    action: 'approve',
    version: 1,
    reason: 'Approved move',
    idempotencyKey: randomUUID(),
  };
  data = transferDetailSchema.parse(
    (await api().post(`${path}/transfers/${id}/transitions`).set(h).send(approve).expect(201)).body,
  );
  await api().post(`${path}/transfers/${id}/transitions`).set(h).send(approve).expect(201);
  let source = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(source.balances[0]).toMatchObject({
    onHand: '20.000000',
    reserved: '10.000000',
    available: '10.000000',
  });
  const dispatch = {
    action: 'dispatch',
    version: data.transfer.version,
    reason: 'Shipped goods',
    idempotencyKey: randomUUID(),
  };
  data = transferDetailSchema.parse(
    (await api().post(`${path}/transfers/${id}/transitions`).set(h).send(dispatch).expect(201))
      .body,
  );
  await api().post(`${path}/transfers/${id}/transitions`).set(h).send(dispatch).expect(201);
  source = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(source.balances[0]).toMatchObject({
    onHand: '10.000000',
    reserved: '0.000000',
    inTransit: '10.000000',
  });
  await api()
    .post(`${path}/transfers/${id}/transitions`)
    .set(h)
    .send({
      action: 'cancel',
      version: data.transfer.version,
      reason: 'Cannot cancel transit',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  const receipt = {
    lineId: data.lines[0]!.id,
    received: '4',
    damaged: '1',
    shortage: '0',
    reason: 'First delivery inspection',
    idempotencyKey: randomUUID(),
  };
  const responses = await Promise.all([
    api().post(`${path}/transfers/${id}/receipts`).set(h).send(receipt).expect(201),
    api().post(`${path}/transfers/${id}/receipts`).set(h).send(receipt).expect(201),
  ]);
  expect(responses[0].body).toEqual(responses[1].body);
  data = transferDetailSchema.parse(responses[0].body);
  expect(data.transfer.state).toBe('partially_received');
  expect(data.receipts).toHaveLength(1);
  await api()
    .post(`${path}/transfers/${id}/receipts`)
    .set(h)
    .send({ ...receipt, received: '6', damaged: '0', idempotencyKey: randomUUID() })
    .expect(409);
  data = transferDetailSchema.parse(
    (
      await api()
        .post(`${path}/transfers/${id}/receipts`)
        .set(h)
        .send({
          ...receipt,
          received: '4',
          damaged: '0',
          shortage: '1',
          reason: 'Final delivery one unit lost',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  expect(data.transfer.state).toBe('completed');
  source = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  const destination = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${destinationId}`).set(h).expect(200)).body,
  );
  expect(source.balances[0]).toMatchObject({ onHand: '10.000000', inTransit: '0.000000' });
  expect(destination.balances[0]).toMatchObject({
    onHand: '9.000000',
    damaged: '1.000000',
    available: '8.000000',
  });
  for (const warehouse of [warehouseA, destinationId])
    expect(
      (await api().get(`${path}/warehouses/${warehouse}/reconciliation`).set(h).expect(200)).body
        .consistent,
    ).toBe(true);
  await expect(
    db().query('DELETE FROM transfer_receipts WHERE business_id=$1', [a]),
  ).rejects.toMatchObject({ code: 'P0001' });
  expect(data.events.map((e) => e.action)).toEqual([
    'created',
    'approve',
    'dispatch',
    'receive',
    'receive',
  ]);
});
