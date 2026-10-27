import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleReceiptSchema, companyProfileSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('captures footer once and preserves prices, cash effects and reprint after policy edits', async () => {
  const { api, path, h, quote, cart } = fixture();
  const save = (version: number, receiptFooter: string) =>
    api()
      .put(`${path}/settings`)
      .set(h)
      .send({
        version,
        values: {
          company: companyProfileSchema.parse({
            receiptFooter,
            transactionCurrency: 'PKR',
            taxBasisPoints: 2000,
          }),
        },
      })
      .expect(200);
  await save(0, 'Original footer');
  const preview = await quote();
  expect(preview.totalMinor).toBe('1375');
  expect(preview.currency).toBe('USD');
  const input = {
    ...cart(),
    quoteFingerprint: preview.quoteFingerprint,
    cashAppliedMinor: preview.totalMinor,
    cashReceivedMinor: preview.totalMinor,
    idempotencyKey: randomUUID(),
  };
  const first = saleReceiptSchema.parse(
    (await api().post(`${path}/sales`).set(h).send(input).expect(201)).body,
  );
  expect(first.sale.receiptFooter).toBe('Original footer');
  await save(1, 'Replacement footer');
  const retry = saleReceiptSchema.parse(
    (await api().post(`${path}/sales`).set(h).send(input).expect(201)).body,
  );
  expect(retry).toEqual(first);
  const reprint = saleReceiptSchema.parse(
    (await api().get(`${path}/sales/${first.sale.id}/receipt`).set(h).expect(200)).body,
  );
  expect(reprint.sale.receiptFooter).toBe('Original footer');
  expect(reprint.payments).toEqual(first.payments);
});
