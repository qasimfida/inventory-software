import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('explains a missing cash shift and rolls back every checkout effect', async () => {
  const f = fixture(),
    preview = await f.quote('1');
  await f
    .db()
    .query(
      "UPDATE cash_shifts SET state='closed',closed_at=now(),closed_by=actor_id,counted_minor=opening_minor,expected_minor=opening_minor WHERE business_id=$1",
      [f.a],
    );
  const before = (
    await f.db().query('SELECT count(*)::int AS n FROM sales WHERE business_id=$1', [f.a])
  ).rows[0].n;
  const response = await f
    .api()
    .post(`${f.path}/sales`)
    .set(f.h)
    .send({
      ...f.cart('1'),
      quoteFingerprint: preview.quoteFingerprint,
      cashAppliedMinor: preview.totalMinor,
      cashReceivedMinor: preview.totalMinor,
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  expect(response.body.code).toBe('CASH_SHIFT_REQUIRED');
  expect(response.body.message).toContain('Open a cash shift');
  expect(
    (await f.db().query('SELECT count(*)::int AS n FROM sales WHERE business_id=$1', [f.a])).rows[0]
      .n,
  ).toBe(before);
  expect((await f.quote('1')).lines[0]!.available).toBe('10.000000');
});
