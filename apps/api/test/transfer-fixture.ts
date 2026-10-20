import { beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { locationSchema, transferDetailSchema } from '@inventory/contracts';
import { stockFixture } from './stock-fixture.js';
import { native } from './auth-fixture.js';
export function transferFixture() {
  const stock = stockFixture();
  let destinationId: string;
  beforeAll(async () => {
    const { api, root, a, ownerToken, storeA, warehouseA, variantId, unitId } = stock(),
      h = native(ownerToken),
      path = `${root}/${a}`;
    destinationId = locationSchema.parse(
      (
        await api()
          .post(`${path}/locations`)
          .set(h)
          .send({ kind: 'warehouses', name: 'Destination', code: 'DEST', storeId: storeA })
          .expect(201)
      ).body,
    ).id;
    await api()
      .post(`${path}/stock/movements`)
      .set(h)
      .send({
        warehouseId: warehouseA,
        variantId,
        unitId,
        type: 'opening',
        quantity: '20',
        reason: 'Opening count',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
  });
  return () => {
    const context = stock(),
      { api, root, a, ownerToken, warehouseA, variantId, unitId } = context,
      path = `${root}/${a}`,
      h = native(ownerToken);
    const create = async (quantity: string, reference: string) =>
      transferDetailSchema.parse(
        (
          await api()
            .post(`${path}/transfers`)
            .set(h)
            .send({
              sourceWarehouseId: warehouseA,
              destinationWarehouseId: destinationId,
              reference,
              lines: [{ variantId, unitId, quantity }],
              idempotencyKey: randomUUID(),
            })
            .expect(201)
        ).body,
      );
    return { ...context, path, h, destinationId, create };
  };
}
