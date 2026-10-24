import { beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { purchaseDetailSchema } from '@inventory/contracts';
import { saleFixture } from './sale-fixture.js';
export function purchasingFixture() {
  const fixture = saleFixture();
  let data: ReturnType<typeof purchaseDetailSchema.parse>;
  beforeAll(async () => {
    const f = fixture();
    const supplier = await f
      .api()
      .post(`${f.path}/suppliers`)
      .set(f.h)
      .send({ name: 'Settlement supplier', code: 'SETTLE' })
      .expect(201);
    data = purchaseDetailSchema.parse(
      (
        await f
          .api()
          .post(`${f.path}/purchases`)
          .set(f.h)
          .send({
            supplierId: supplier.body.id,
            warehouseId: f.warehouseA,
            reference: 'PO-SETTLE',
            currency: 'USD',
            lines: [{ variantId: f.variantId, unitId: f.unitId, quantity: '10', unitCost: '1' }],
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
    for (const action of ['approve', 'order'])
      data = purchaseDetailSchema.parse(
        (
          await f
            .api()
            .post(`${f.path}/purchases/${data.order.id}/transitions`)
            .set(f.h)
            .send({
              action,
              version: data.order.version,
              reason: 'Approved supply',
              idempotencyKey: randomUUID(),
            })
            .expect(201)
        ).body,
      );
    data = purchaseDetailSchema.parse(
      (
        await f
          .api()
          .post(`${f.path}/purchases/${data.order.id}/receipts`)
          .set(f.h)
          .send({
            lineId: data.lines[0]!.id,
            quantity: '10',
            damaged: '2',
            damageReason: 'Packaging crushed',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
    data = purchaseDetailSchema.parse(
      (
        await f
          .api()
          .post(`${f.path}/purchases/${data.order.id}/invoices`)
          .set(f.h)
          .send({
            reference: 'INV-SETTLE',
            amountMinor: '1000',
            dueDate: '2026-12-31',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  });
  return () => {
    const f = fixture(),
      invoiceId = data.invoices[0]!.id;
    return {
      ...f,
      data,
      invoiceId,
      payablePath: `${f.path}/payables/${invoiceId}`,
      returnPath: `${f.path}/purchases/${data.order.id}/returns`,
    };
  };
}
