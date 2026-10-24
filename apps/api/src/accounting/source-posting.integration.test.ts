import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { accountingPageSchema, journalSchema } from '@inventory/contracts';
import { purchasingFixture } from '../../test/purchasing-fixture.js';
import { native } from '../../test/auth-fixture.js';
describe('source accounting and reconciliation', () => {
  const fixture = purchasingFixture();
  it('posts confirmed invoice and settlement once, matching the payable subledger', async () => {
    const f = fixture(),
      path = `${f.path}/accounting`,
      today = new Date().toISOString().slice(0, 10);
    await f
      .api()
      .post(`${path}/periods`)
      .set(f.h)
      .send({ from: today, to: today, idempotencyKey: randomUUID() })
      .expect(201);
    await f
      .api()
      .post(`${f.payablePath}/settlements`)
      .set(f.h)
      .send({
        kind: 'payment',
        amountMinor: '250',
        reference: 'Accounting partial payment',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    const page = accountingPageSchema.parse((await f.api().get(path).set(f.h).expect(200)).body);
    expect(page.pending.map((s) => s.kind).sort()).toEqual([
      'supplier_invoice',
      'supplier_settlement',
    ]);
    for (const source of page.pending) {
      const input = { kind: source.kind, sourceId: source.id, idempotencyKey: randomUUID() };
      const j = journalSchema.parse(
        (await f.api().post(`${path}/sources`).set(f.h).send(input).expect(201)).body,
      );
      expect(
        (
          await f
            .api()
            .post(`${path}/sources`)
            .set(f.h)
            .send({ ...input, idempotencyKey: randomUUID() })
            .expect(201)
        ).body.id,
      ).toBe(j.id);
      await f
        .api()
        .post(`${f.root}/${f.b}/accounting/sources`)
        .set(native(f.otherToken))
        .send(input)
        .expect(404);
    }
    const posted = accountingPageSchema.parse((await f.api().get(path).set(f.h).expect(200)).body);
    expect(posted.pending).toEqual([]);
    expect(posted.journals).toHaveLength(2);
    const ap = posted.balances.find((b) => b.account === '2000')!;
    expect(BigInt(ap.credit) - BigInt(ap.debit)).toBe(750n);
    const payable = await f.api().get(f.payablePath).set(f.h).expect(200);
    expect(payable.body.invoice.outstandingMinor).toBe('750');
    expect(
      (
        await f
          .db()
          .query(
            'SELECT sum(debit)-sum(credit) AS delta FROM accounting_lines WHERE business_id=$1',
            [f.a],
          )
      ).rows[0].delta,
    ).toBe('0');
  });
});
