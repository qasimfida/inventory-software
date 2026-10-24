import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { deltaSchema, leaseSchema, offlinePolicySchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { DatabaseService } from '../database/database.service.js';
import { issueRecovery } from '../auth/password-recovery.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();

it('resets a cursor when its requested currency changes without losing an existing lease', async () => {
  const f = fixture();
  const usd = deltaSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/sync/delta?warehouseId=${f.warehouseA}&currency=USD`)
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(usd.items).toHaveLength(1);
  const eur = deltaSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/sync/delta?warehouseId=${f.warehouseA}&currency=EUR&cursor=${usd.cursor}`)
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(eur).toMatchObject({ reset: true, replaceAll: true, items: [] });
});

it('password recovery revokes old offline grants; reconnect retains a conflict without a sale', async () => {
  const f = fixture();
  await f
    .api()
    .put(`${f.path}/sync/policy`)
    .set(f.h)
    .send(offlinePolicySchema.parse({ enabled: true }))
    .expect(200);
  const lease = leaseSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sync/prepare`)
        .set(f.h)
        .send({ warehouseId: f.warehouseA, currency: 'USD', deviceId: randomUUID() })
        .expect(201)
    ).body,
  );
  const email = (
    await f
      .db()
      .query<{ email: string }>('SELECT email FROM auth_accounts WHERE id=$1', [f.ownerId])
  ).rows[0]!.email;
  const code = await issueRecovery(f.application().get(DatabaseService), email);
  const password = 'recovered original account passphrase';
  await f
    .api()
    .post('/api/v1/auth/password/reset')
    .set(native())
    .send({ email, password, resetToken: code })
    .expect(201);
  await f.api().get(`${f.path}/sync/identity`).set(f.h).expect(401);
  const login = await f
    .api()
    .post('/api/v1/auth/login')
    .set(native())
    .send({ email, password })
    .expect(201);
  const operation = {
    id: randomUUID(),
    kind: 'sale',
    leaseId: lease.id,
    occurredAt: new Date().toISOString(),
    lines: f.cart().lines,
    totalMinor: '1375',
    cashReceivedMinor: '1375',
  };
  const response = await f
    .api()
    .post(`${f.path}/sync/upload`)
    .set(native(login.body.token))
    .send({ operations: [operation] })
    .expect(201);
  expect(response.body.results[0].state).toBe('conflict');
  expect(
    (await f.db().query('SELECT count(*) FROM sales WHERE business_id=$1', [f.a])).rows[0].count,
  ).toBe('0');
  expect(
    (
      await f
        .db()
        .query('SELECT payload FROM sync_operations WHERE business_id=$1 AND id=$2', [
          f.a,
          operation.id,
        ])
    ).rows,
  ).toHaveLength(1);
});
