import { expect, it } from 'vitest';
import { authFixture, native } from '../../test/auth-fixture.js';
import { parseEnvironment } from '../config/environment.js';
import { seedDevelopment } from './seed.js';

const fixture = authFixture('inventory_dev_');
it('refuses to adopt an existing account with a fixture email and creates nothing', async () => {
  const existing = await fixture.register('admin@example.test');
  const before = (await fixture.db().query('SELECT * FROM auth_accounts')).rows;
  await expect(
    seedDevelopment(parseEnvironment({ ...process.env, NODE_ENV: 'development' })),
  ).rejects.toThrow('Fixture collision');
  expect((await fixture.db().query('SELECT * FROM auth_accounts')).rows).toEqual(before);
  expect((await fixture.db().query('SELECT * FROM platform_administrators')).rowCount).toBe(0);
  expect((await fixture.db().query('SELECT * FROM businesses')).rowCount).toBe(0);
  await fixture.api().get('/api/v1/auth/session').set(native(existing.token)).expect(200);
});
