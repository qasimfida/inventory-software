import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = organizationFixture();
const mapping = {
  sku: 'Code',
  name: 'Title',
  price: 'Amount',
  currency: 'Money',
  description: '',
  quantity: '',
};
it('persists business mappings with version, permission and tenant isolation', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/imports/templates`,
    headers = native(f.ownerToken);
  await f.api().get(path).set(native(f.viewerToken)).expect(403);
  await f
    .api()
    .post(path)
    .set(native(f.otherToken))
    .send({ name: 'Other tenant', mapping })
    .expect(404);
  const created = (
    await f.api().post(path).set(headers).send({ name: 'Supplier sheet', mapping }).expect(201)
  ).body;
  expect(created.version).toBe(1);
  expect((await f.api().get(path).set(headers).expect(200)).body.items).toContainEqual(created);
  await f.api().post(path).set(headers).send({ name: 'SUPPLIER SHEET', mapping }).expect(409);
  const updated = (
    await f
      .api()
      .patch(`${path}/${created.id}`)
      .set(headers)
      .send({ name: 'Updated supplier sheet', mapping, version: 1 })
      .expect(200)
  ).body;
  await f
    .api()
    .patch(`${path}/${created.id}`)
    .set(headers)
    .send({ name: 'Stale', mapping, version: 1 })
    .expect(409);
  await f.api().delete(`${path}/${created.id}?version=2`).set(native(f.otherToken)).expect(404);
  await f.api().delete(`${path}/${created.id}?version=1`).set(headers).expect(409);
  await f.api().delete(`${path}/${created.id}?version=${updated.version}`).set(headers).expect(200);
  expect((await f.api().get(path).set(headers).expect(200)).body.items).toEqual([]);
});
it('preflight finds existing identifiers without creating products or stock', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    headers = native(f.ownerToken);
  await f
    .api()
    .post(`${path}/products`)
    .set(headers)
    .send({ sku: 'EXISTING', name: 'Existing' })
    .expect(201);
  const before = (
    await f.db().query('SELECT count(*) FROM catalog_products WHERE business_id=$1', [f.a])
  ).rows[0].count;
  const input = {
    warehouseId: null,
    idempotencyKey: randomUUID(),
    rows: [
      {
        sku: 'EXISTING',
        name: 'Existing',
        description: '',
        price: '2',
        currency: 'USD',
        quantity: '0',
      },
      { sku: 'NEW', name: 'New', description: '', price: '3', currency: 'USD', quantity: '0' },
    ],
  };
  const result = (
    await f.api().post(`${path}/imports/products/validate`).set(headers).send(input).expect(201)
  ).body;
  expect(result.errors).toEqual([expect.objectContaining({ row: 2, field: 'sku' })]);
  expect(
    (await f.db().query('SELECT count(*) FROM catalog_products WHERE business_id=$1', [f.a]))
      .rows[0].count,
  ).toBe(before);
  await f
    .api()
    .post(`${path}/imports/products/validate`)
    .set(native(f.otherToken))
    .send(input)
    .expect(404);
  await f
    .api()
    .post(`${path}/imports/products/validate`)
    .set(native(f.viewerToken))
    .send(input)
    .expect(403);
});
it('rechecks a SKU claimed after preflight and rolls back the whole batch', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    headers = native(f.ownerToken);
  const row = { name: 'Race product', description: '', price: '1', currency: 'USD', quantity: '0' };
  const input = {
    warehouseId: null,
    idempotencyKey: randomUUID(),
    rows: [
      { ...row, sku: 'RACE-FIRST' },
      { ...row, sku: 'RACE-TAKEN' },
    ],
  };
  expect(
    (await f.api().post(`${path}/imports/products/validate`).set(headers).send(input).expect(201))
      .body.errors,
  ).toEqual([]);
  await f
    .api()
    .post(`${path}/products`)
    .set(headers)
    .send({ name: 'Created by another operator', sku: 'RACE-TAKEN' })
    .expect(201);
  await f.api().post(`${path}/imports/products`).set(headers).send(input).expect(409);
  expect(
    (
      await f
        .db()
        .query('SELECT id FROM catalog_products WHERE business_id=$1 AND sku=$2', [
          f.a,
          'RACE-FIRST',
        ])
    ).rowCount,
  ).toBe(0);
  expect(
    (
      await f
        .db()
        .query(
          'SELECT idempotency_key FROM operation_receipts WHERE business_id=$1 AND idempotency_key=$2',
          [f.a, input.idempotencyKey],
        )
    ).rowCount,
  ).toBe(0);
});
