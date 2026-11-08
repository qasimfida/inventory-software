import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { shiftPageSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
it('reconciles shift receipts, authorized cash adjustments, exact close discrepancy and duplicate close', async () => {
  const f = fixture(),
    page = () =>
      f.api().get(`${f.path}/cash-shifts?warehouseId=${f.warehouseA}`).set(f.h).expect(200);
  const shift = shiftPageSchema.parse((await page()).body).shifts[0]!;
  const q = await f.quote(),
    sale = {
      ...f.cart(),
      quoteFingerprint: q.quoteFingerprint,
      cashAppliedMinor: q.totalMinor,
      cashReceivedMinor: '1500',
      idempotencyKey: randomUUID(),
    };
  await f.api().post(`${f.path}/sales`).set(f.h).send(sale).expect(201);
  const adjustment = {
    kind: 'cash_out',
    amountMinor: '1000',
    reference: 'Bank deposit',
    idempotencyKey: randomUUID(),
  };
  await f
    .api()
    .post(`${f.path}/cash-shifts/${shift.id}/entries`)
    .set(f.h)
    .send(adjustment)
    .expect(201);
  await f
    .api()
    .post(`${f.path}/cash-shifts/${shift.id}/entries`)
    .set(f.h)
    .send(adjustment)
    .expect(201);
  await f
    .api()
    .post(`${f.path}/cash-shifts/${shift.id}/entries`)
    .set(native(f.viewerToken))
    .send({ ...adjustment, idempotencyKey: randomUUID() })
    .expect(403);
  await f
    .api()
    .get(`${f.root}/${f.b}/cash-shifts?warehouseId=${f.warehouseA}`)
    .set(native(f.otherToken))
    .expect(404);
  expect(shiftPageSchema.parse((await page()).body).shifts[0]!.expectedMinor).toBe('10375');
  const close = { countedMinor: '10370', idempotencyKey: randomUUID() };
  const response = (
    await f.api().post(`${f.path}/cash-shifts/${shift.id}/close`).set(f.h).send(close).expect(201)
  ).body;
  expect(response.discrepancyMinor).toBe('-5');
  expect(
    (await f.api().post(`${f.path}/cash-shifts/${shift.id}/close`).set(f.h).send(close).expect(201))
      .body,
  ).toEqual(response);
  await f
    .api()
    .post(`${f.path}/sales`)
    .set(f.h)
    .send({ ...sale, idempotencyKey: randomUUID() })
    .expect(409);
  // An already-confirmed checkout is still safe to retry after shift close.
  await f.api().post(`${f.path}/sales`).set(f.h).send(sale).expect(201);
  await expect(
    f.db().query('UPDATE cash_shifts SET counted_minor=0 WHERE id=$1', [shift.id]),
  ).rejects.toThrow();
});

it('composes server filters before paging and keeps my open shift visible independently', async () => {
  const f = fixture();
  const query = async (extra: object = {}) =>
    (
      await f
        .api()
        .get(`${f.path}/cash-shifts`)
        .set(f.h)
        .query({ warehouseId: f.warehouseA, ...extra })
        .expect(200)
    ).body;
  const previous = shiftPageSchema.parse(await query()).shifts[0]!;
  await f
    .api()
    .post(`${f.path}/cash-shifts`)
    .set(f.h)
    .send({
      warehouseId: f.warehouseA,
      terminalId: previous.terminalId,
      currency: previous.currency,
      openingMinor: '0',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const initial = shiftPageSchema.parse(await query());
  const shift = initial.shifts[0]!;
  expect(initial.activeShifts?.some((s) => s.id === shift.id)).toBe(true);
  expect(
    (await query({ search: shift.id, state: 'open', terminalId: shift.terminalId })).shifts,
  ).toHaveLength(1);
  const empty = await query({ search: 'not-a-shift', state: 'closed', offset: 25 });
  expect(empty.shifts).toHaveLength(0);
  expect(empty.activeShifts.some((s: { id: string }) => s.id === shift.id)).toBe(true);
  expect((await query({ to: '2000-01-01' })).shifts).toHaveLength(0);
  expect((await query({ actorId: randomUUID() })).shifts).toHaveLength(0);
});
