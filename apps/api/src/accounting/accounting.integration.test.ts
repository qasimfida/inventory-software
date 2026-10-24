import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { journalSchema, accountingPageSchema } from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
describe('balanced immutable accounting', () => {
  const fixture = organizationFixture();
  it('posts exact large amounts, rejects invalid journals and permits only append-only reversals', async () => {
    const f = fixture(),
      path = `${f.root}/${f.a}/accounting`,
      h = native(f.ownerToken);
    await f.api().get(path).expect(401);
    await f.api().get(path).set(native(f.viewerToken)).expect(403);
    await f.api().get(path).set(native(f.otherToken)).expect(404);
    const period = { from: '2025-01-01', to: '2025-12-31', idempotencyKey: randomUUID() };
    const p = await f.api().post(`${path}/periods`).set(h).send(period).expect(201);
    expect((await f.api().post(`${path}/periods`).set(h).send(period).expect(201)).body).toEqual(
      p.body,
    );
    await f
      .api()
      .post(`${path}/periods`)
      .set(h)
      .send({ ...period, idempotencyKey: randomUUID() })
      .expect(409);
    const input = {
      date: '2025-01-02',
      currency: 'USD',
      reason: 'Verified opening balance',
      lines: [
        { account: '1000', debit: '9007199254740993', credit: '0' },
        { account: '3000', debit: '0', credit: '9007199254740993' },
      ],
      idempotencyKey: randomUUID(),
    };
    const j = journalSchema.parse(
      (await f.api().post(`${path}/journals`).set(h).send(input).expect(201)).body,
    );
    expect((await f.api().post(`${path}/journals`).set(h).send(input).expect(201)).body.id).toBe(
      j.id,
    );
    await f
      .api()
      .post(`${path}/journals`)
      .set(h)
      .send({ ...input, reason: 'Changed immutable request' })
      .expect(409);
    await f
      .api()
      .post(`${path}/journals`)
      .set(h)
      .send({
        ...input,
        idempotencyKey: randomUUID(),
        lines: [input.lines[0], { account: '3000', debit: '0', credit: '1' }],
      })
      .expect(400);
    await expect(
      f.db().query("UPDATE accounting_journals SET reason='changed' WHERE id=$1", [j.id]),
    ).rejects.toThrow();
    await expect(
      f
        .db()
        .query(
          "INSERT INTO accounting_lines(business_id,journal_id,account,debit,credit) VALUES($1,$2,'1000',1,0)",
          [f.a, j.id],
        ),
    ).rejects.toThrow();
    const reverse = {
      date: '2025-01-03',
      reason: 'Opening balance correction',
      idempotencyKey: randomUUID(),
    };
    const r = journalSchema.parse(
      (await f.api().post(`${path}/journals/${j.id}/reverse`).set(h).send(reverse).expect(201))
        .body,
    );
    expect(r.reversalId).toBe(j.id);
    await f
      .api()
      .post(`${path}/journals/${j.id}/reverse`)
      .set(h)
      .send({ ...reverse, idempotencyKey: randomUUID() })
      .expect(409);
    const page = accountingPageSchema.parse((await f.api().get(path).set(h).expect(200)).body);
    expect(page.journals).toHaveLength(2);
    expect(page.balances.every((b) => b.debit === b.credit)).toBe(true);
    await f
      .api()
      .post(`${path}/periods/${p.body.id}/close`)
      .set(h)
      .send({ reason: 'Reviewed and balanced period', idempotencyKey: randomUUID() })
      .expect(201);
    await f
      .api()
      .post(`${path}/journals`)
      .set(h)
      .send({ ...input, idempotencyKey: randomUUID() })
      .expect(409);
    await f
      .api()
      .post(`${f.root}/${f.b}/accounting/journals/${j.id}/reverse`)
      .set(native(f.otherToken))
      .send(reverse)
      .expect(404);
  });
  it('enforces balancing at database commit and rolls back a malformed posting', async () => {
    const f = fixture(),
      path = `${f.root}/${f.a}/accounting`,
      h = native(f.ownerToken);
    const p = await f
      .api()
      .post(`${path}/periods`)
      .set(h)
      .send({ from: '2024-01-01', to: '2024-12-31', idempotencyKey: randomUUID() })
      .expect(201);
    const db = await f.db().connect(),
      id = randomUUID();
    try {
      await db.query('BEGIN');
      await db.query(
        `INSERT INTO accounting_journals(id,business_id,period_id,posted_on,currency,reason,source_kind,actor_id) VALUES($1,$2,$3,'2024-02-01','USD','Invalid DB write','manual',$4)`,
        [id, f.a, p.body.id, f.ownerId],
      );
      await db.query(
        "INSERT INTO accounting_lines(business_id,journal_id,account,debit,credit) VALUES($1,$2,'1000',1,0)",
        [f.a, id],
      );
      await expect(db.query('COMMIT')).rejects.toThrow('balanced');
      await db.query('ROLLBACK');
    } finally {
      db.release();
    }
    expect(
      (await f.db().query('SELECT id FROM accounting_journals WHERE id=$1', [id])).rowCount,
    ).toBe(0);
    await f
      .db()
      .query(
        'UPDATE business_memberships SET scope_store_id=$1 WHERE business_id=$2 AND account_id=$3',
        [f.storeA, f.a, f.managerId],
      );
    await f.api().get(path).set(native(f.managerToken)).expect(403);
    await f
      .db()
      .query(
        "UPDATE business_memberships SET role='custom',scope_store_id=NULL,permissions=ARRAY['reports.write','payments.read','payments.write','sales.read','purchases.read'] WHERE business_id=$1 AND account_id=$2",
        [f.a, f.managerId],
      );
    await f
      .api()
      .post(`${path}/periods`)
      .set(native(f.managerToken))
      .send({ from: '2023-01-01', to: '2023-12-31', idempotencyKey: randomUUID() })
      .expect(403);
  });
});
