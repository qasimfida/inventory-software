import { it, vi } from 'vitest';
import { authFixture, native, password } from '../../test/auth-fixture.js';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword } from '../auth/secrets.js';

const fixture = authFixture();
it('does not issue a session if credentials change after password verification but before the account lock', async () => {
  const user = await fixture.register('password-race@example.test');
  const database = fixture.application().get(DatabaseService);
  const original = database.transaction.bind(database);
  const newPassword = 'replacement password for local race test';
  const hash = await hashPassword(newPassword);
  const spy = vi.spyOn(database, 'transaction').mockImplementationOnce(async (work) => {
    await database.query('UPDATE auth_accounts SET password_hash=$1 WHERE id=$2', [
      hash,
      user.user.id,
    ]);
    return original(work);
  });
  try {
    await fixture
      .api()
      .post('/api/v1/auth/login')
      .set(native())
      .send({ email: user.user.email, password })
      .expect(401);
    await fixture
      .api()
      .post('/api/v1/auth/login')
      .set(native())
      .send({ email: user.user.email, password: newPassword })
      .expect(201);
  } finally {
    spy.mockRestore();
  }
});
