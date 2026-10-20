import { randomUUID } from 'node:crypto';
import { beforeAll, expect, it } from 'vitest';
import {
  authResponseSchema,
  permissionSchema,
  rolePermissions,
  workspaceSchema,
} from '@inventory/contracts';
import { authFixture, native } from '../../test/auth-fixture.js';
import { parseEnvironment } from '../config/environment.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import { seedDevelopment } from './seed.js';
import {
  developmentAccounts as accounts,
  developmentIds as ids,
  developmentPassword as password,
  fixtureId,
} from './fixtures.js';

const fixture = authFixture('inventory_dev_');
const tokens = new Map<string, string>();
const environment = () => parseEnvironment({ ...process.env, NODE_ENV: 'development' });
const base = `/api/v1/businesses/${ids.business}`;

beforeAll(async () => {
  expect(await seedDevelopment(environment())).toBe('created');
  for (const account of accounts) {
    const response = await fixture
      .api()
      .post('/api/v1/auth/login')
      .set(native())
      .send({ email: account.email, password })
      .expect(201);
    const result = authResponseSchema.parse(response.body);
    expect(result.user.id).toBe(account.id);
    tokens.set(account.id, result.token!);
  }
}, 20000);

it('stores seven independently salted hashes and preserves identities, passwords and sessions on rerun', async () => {
  const before = (
    await fixture.db().query('SELECT id,email,password_hash FROM auth_accounts ORDER BY id')
  ).rows;
  expect(before).toHaveLength(7);
  expect(new Set(before.map((r) => r.password_hash)).size).toBe(7);
  for (const row of before) {
    expect(row.password_hash).toMatch(/^scrypt-v1\$/);
    expect(row.password_hash).not.toContain(password);
  }
  expect(await seedDevelopment(environment())).toBe('preserved');
  expect(
    (await fixture.db().query('SELECT id,email,password_hash FROM auth_accounts ORDER BY id')).rows,
  ).toEqual(before);
  expect((await fixture.db().query('SELECT * FROM businesses')).rowCount).toBe(2);
  expect(
    (
      await fixture
        .db()
        .query('SELECT * FROM business_memberships WHERE account_id=$1', [fixtureId(1)])
    ).rowCount,
  ).toBe(0);
  await fixture
    .api()
    .get('/api/v1/auth/session')
    .set(native(tokens.get(fixtureId(1))))
    .expect(200);
});

it('checks every permission through the backend scope, with correct tenant and warehouse assignments', async () => {
  const scope = fixture.application().get(OrganizationScope);
  for (const account of accounts) {
    const view = workspaceSchema.parse(
      (
        await fixture
          .api()
          .get(base)
          .set(native(tokens.get(account.id)))
          .expect(200)
      ).body,
    );
    expect(view.business.role).toBe(account.role);
    expect(view.business.scope?.warehouseId).toBe(account.scoped ? ids.warehouse : null);
    const allowed = rolePermissions(account.role, account.permissions);
    for (const permission of permissionSchema.options) {
      const check = scope.run(
        { accountId: account.id, requestId: randomUUID() },
        ids.business,
        permission,
        async () => true,
      );
      if (allowed.includes(permission)) await expect(check).resolves.toBe(true);
      else await expect(check).rejects.toMatchObject({ status: 403 });
    }
    await fixture
      .api()
      .get(`${base}/products`)
      .set(native(tokens.get(account.id)))
      .expect(allowed.includes('products.read') ? 200 : 403);
  }
});

it('permits platform access without membership and denies ordinary users cross-business access or role escalation', async () => {
  const other = `/api/v1/businesses/${ids.isolatedBusiness}`;
  for (const account of accounts) {
    const headers = native(tokens.get(account.id));
    const list = await fixture.api().get('/api/v1/businesses').set(headers).expect(200);
    expect(list.body.businesses).toHaveLength(account.role === 'super_admin' ? 2 : 1);
    await fixture
      .api()
      .get(other)
      .set(headers)
      .expect(account.role === 'super_admin' ? 200 : 404);
    await fixture
      .api()
      .patch(other)
      .set(headers)
      .send({ name: 'Local Isolation Business', state: 'active', timeZone: 'UTC', version: 1 })
      .expect(account.role === 'super_admin' ? 200 : 404);
    if (account.role !== 'super_admin')
      await fixture
        .api()
        .patch(`${base}/members/${account.id}`)
        .set(headers)
        .send({ role: 'super_admin', state: 'active', version: 1 })
        .expect(400);
    if (!['owner', 'super_admin'].includes(account.role))
      await fixture
        .api()
        .patch(`${base}/members/${account.id}`)
        .set(headers)
        .send({ role: 'owner', state: 'active', version: 1 })
        .expect(403);
  }
});

it('uses the browser cookie flow without exposing bearer tokens', async () => {
  const response = await fixture
    .api()
    .post('/api/v1/auth/login')
    .set({ origin: 'http://localhost:5173', 'x-inventory-client': 'web' })
    .send({ email: 'admin@example.test', password })
    .expect(201);
  expect(response.body.token).toBeUndefined();
  expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
  await fixture
    .api()
    .get('/api/v1/auth/session')
    .set('Cookie', String(response.headers['set-cookie']).split(';')[0]!)
    .expect(200);
});

it('refuses production before connecting and protects collisions atomically', async () => {
  await expect(seedDevelopment({ ...environment(), NODE_ENV: 'production' })).rejects.toThrow(
    'requires NODE_ENV',
  );
  await fixture
    .db()
    .query('UPDATE auth_accounts SET email=$1 WHERE id=$2', ['changed@example.test', fixtureId(7)]);
  await expect(seedDevelopment(environment(), true)).rejects.toThrow('ownership mismatch');
  await fixture
    .api()
    .get('/api/v1/auth/session')
    .set(native(tokens.get(fixtureId(1))))
    .expect(200);
  await fixture
    .db()
    .query('UPDATE auth_accounts SET email=$1 WHERE id=$2', ['viewer@example.test', fixtureId(7)]);
});

it('explicit reset changes only fixture credentials, revokes their sessions and preserves unrelated users', async () => {
  const other = await fixture.register('unrelated@example.test');
  const before = (
    await fixture.db().query('SELECT * FROM auth_accounts WHERE id=$1', [other.user.id])
  ).rows;
  expect(await seedDevelopment(environment(), true)).toBe('reset');
  expect(
    (await fixture.db().query('SELECT * FROM auth_accounts WHERE id=$1', [other.user.id])).rows,
  ).toEqual(before);
  await fixture.api().get('/api/v1/auth/session').set(native(other.token)).expect(200);
  for (const account of accounts) {
    await fixture
      .api()
      .get('/api/v1/auth/session')
      .set(native(tokens.get(account.id)))
      .expect(401);
    await fixture
      .api()
      .post('/api/v1/auth/login')
      .set(native())
      .send({ email: account.email, password })
      .expect(201);
  }
}, 20000);
