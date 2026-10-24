import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { payablePageSchema, purchaseDetailSchema } from '@inventory/contracts';
import { purchasingFixture } from '../../test/purchasing-fixture.js';
const fixture = purchasingFixture();
it('keeps supplier currencies separate, requires the matching cash shift and rejects credit from another purchase', async () => {
  const f = fixture();
  let order = purchaseDetailSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/purchases`)
        .set(f.h)
        .send({
          supplierId: f.data.order.supplierId,
          warehouseId: f.warehouseA,
          reference: 'PO-EUR',
          currency: 'EUR',
          lines: [{ variantId: f.variantId, unitId: f.unitId, quantity: '1', unitCost: '2' }],
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  for (const action of ['approve', 'order'])
    order = purchaseDetailSchema.parse(
      (
        await f
          .api()
          .post(`${f.path}/purchases/${order.order.id}/transitions`)
          .set(f.h)
          .send({
            action,
            version: order.order.version,
            reason: 'Approve euro order',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  order = purchaseDetailSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/purchases/${order.order.id}/invoices`)
        .set(f.h)
        .send({
          reference: 'EUR-INVOICE',
          amountMinor: '200',
          dueDate: '2026-12-31',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const path = `${f.path}/payables/${order.invoices[0]!.id}`;
  const page = payablePageSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/payables?warehouseId=${f.warehouseA}&supplierId=${f.data.order.supplierId}`)
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(page.totals).toEqual([
    { currency: 'EUR', payableMinor: '200', supplierOwesMinor: '0' },
    { currency: 'USD', payableMinor: '1000', supplierOwesMinor: '0' },
  ]);
  await f
    .api()
    .post(`${path}/settlements`)
    .set(f.h)
    .send({
      kind: 'payment',
      amountMinor: '100',
      reference: 'WRONG-SHIFT',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  const returned = purchaseDetailSchema.parse(
    (
      await f
        .api()
        .post(f.returnPath)
        .set(f.h)
        .send({
          receiptId: f.data.receipts[0]!.id,
          quantity: '1',
          reason: 'Return dollar goods',
          creditReference: 'DOLLAR-RETURN',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  await f
    .api()
    .post(`${path}/credits`)
    .set(f.h)
    .send({
      returnId: returned.returns[0]!.id,
      amountMinor: '100',
      reason: 'Mismatched purchase',
      reference: 'CROSS-ORDER-CREDIT',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  expect((await f.api().get(path).set(f.h).expect(200)).body.invoice.outstandingMinor).toBe('200');
  await expect(
    f.db().query(
      `INSERT INTO supplier_credits(id,business_id,invoice_id,return_id,amount_minor,reference,reason,actor_id)
     VALUES($1,$2,$3,$4,1,'FOREIGN','Cross business FK',$5)`,
      [randomUUID(), f.b, f.invoiceId, returned.returns[0]!.id, f.ownerId],
    ),
  ).rejects.toMatchObject({ code: '23503' });
});
