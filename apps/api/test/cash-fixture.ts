import { randomUUID } from 'node:crypto';
import type { ReturnTypeOfStock } from './fixture-types.js';
import { native } from './auth-fixture.js';
export async function openCash(f: ReturnTypeOfStock) {
  const path = `${f.root}/${f.a}`,
    h = native(f.ownerToken);
  const terminal = (
    await f
      .api()
      .post(`${path}/locations`)
      .set(h)
      .send({
        kind: 'terminals',
        type: 'pos',
        name: 'Cash desk',
        code: `C-${randomUUID().slice(0, 8)}`,
        storeId: f.storeA,
        warehouseId: f.warehouseA,
      })
      .expect(201)
  ).body;
  return String(
    (
      await f
        .api()
        .post(`${path}/cash-shifts`)
        .set(h)
        .send({
          warehouseId: f.warehouseA,
          terminalId: terminal.id,
          currency: 'USD',
          openingMinor: '10000',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body.id,
  );
}
