import { openCash } from './cash-fixture.js';
import { beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleQuoteSchema } from '@inventory/contracts';
import { stockFixture } from './stock-fixture.js';
import { native } from './auth-fixture.js';
export function saleFixture() {
  const stock = stockFixture();
  beforeAll(async () => {
    await openCash(stock());
    const { api, root, a, ownerToken, variantId, unitId, warehouseA } = stock(),
      h = native(ownerToken),
      path = `${root}/${a}`;
    await api()
      .post(`${path}/prices`)
      .set(h)
      .send({
        variantId,
        unitPrice: '12.50',
        currency: 'USD',
        taxBasisPoints: 1000,
        taxInclusive: false,
        startsAt: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);
    await api()
      .post(`${path}/stock/movements`)
      .set(h)
      .send({
        variantId,
        unitId,
        warehouseId: warehouseA,
        type: 'opening',
        quantity: '10',
        reason: 'POS opening count',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
  });
  return () => {
    const f = stock(),
      path = `${f.root}/${f.a}`,
      h = native(f.ownerToken);
    const cart = (quantity = '1', customerId: string | null = null) => ({
      warehouseId: f.warehouseA,
      customerId,
      lines: [{ variantId: f.variantId, unitId: f.unitId, quantity }],
    });
    const quote = async (quantity = '1', customerId: string | null = null) =>
      saleQuoteSchema.parse(
        (
          await f
            .api()
            .post(`${path}/pos/quotes`)
            .set(h)
            .send(cart(quantity, customerId))
            .expect(201)
        ).body,
      );
    return { ...f, path, h, cart, quote };
  };
}
