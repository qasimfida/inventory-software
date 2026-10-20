import { beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { authFixture, native } from '../../test/auth-fixture.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import { idempotent } from './idempotency.js';
const { api, register, db, application } = authFixture();
let businessId: string, accountId: string;
beforeAll(async () => {
  const account = await register('idempotency@test.example');
  accountId = account.user.id;
  businessId = (
    await api()
      .post('/api/v1/businesses')
      .set(native(account.token))
      .send({ name: 'Idempotency' })
      .expect(201)
  ).body.id;
});
function run(key: string, input: unknown, work: Parameters<typeof idempotent>[4]) {
  return application()
    .get(OrganizationScope)
    .run({ accountId, requestId: randomUUID() }, businessId, 'business.read', (ctx) =>
      idempotent(ctx, 'test.operation', key, input, work),
    );
}
it('replays one result for simultaneous identical requests and rejects changed payloads', async () => {
  const key = randomUUID();
  let executions = 0;
  const results = await Promise.all([
    run(key, { a: 1, b: 2 }, async () => ({ number: ++executions })),
    run(key, { b: 2, a: 1 }, async () => ({ number: ++executions })),
  ]);
  expect(executions).toBe(1);
  expect(results).toEqual([{ number: 1 }, { number: 1 }]);
  await expect(run(key, { a: 2 }, async () => ({ number: 3 }))).rejects.toMatchObject({
    status: 409,
  });
});
it('rolls back receipts on failure and refuses replay after permission context changes', async () => {
  const key = randomUUID();
  await expect(
    run(key, {}, async () => {
      throw new Error('failed');
    }),
  ).rejects.toThrow('failed');
  expect(
    (await db().query('SELECT 1 FROM operation_receipts WHERE idempotency_key=$1', [key])).rowCount,
  ).toBe(0);
  await run(key, {}, async () => ({ ok: true }));
  await db().query(
    "UPDATE business_memberships SET role='viewer' WHERE business_id=$1 AND account_id=$2",
    [businessId, accountId],
  );
  await expect(run(key, {}, async () => ({ ok: false }))).rejects.toMatchObject({ status: 409 });
});
