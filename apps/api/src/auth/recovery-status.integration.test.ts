import { expect, it } from 'vitest';
import { authFixture, native } from '../../test/auth-fixture.js';
import { newToken, tokenHash } from './secrets.js';
const { api, register, db } = authFixture();
it('validates recovery without consuming it and rejects expired, consumed, inactive and wrong-account tokens', async () => {
  const user = await register('recovery-status@example.test'),
    token = newToken();
  await db().query(
    "INSERT INTO auth_password_resets(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
    [user.user.id, tokenHash(token)],
  );
  const status = (email = user.user.email, resetToken = token) =>
    api().post('/api/v1/auth/password/status').set(native()).send({ email, resetToken });
  const response = await status().expect(201);
  expect(response.body.valid).toBe(true);
  expect(Date.parse(response.body.expiresAt)).toBeGreaterThan(Date.now());
  await status().expect(201);
  await status('different@example.test').expect(401);
  await status(user.user.email, newToken()).expect(401);
  await db().query(
    "UPDATE auth_password_resets SET created_at=now()-interval '31 minutes',expires_at=now()-interval '1 minute' WHERE account_id=$1",
    [user.user.id],
  );
  await status().expect(401);
  await db().query(
    "UPDATE auth_password_resets SET expires_at=now()+interval '30 minutes',consumed_at=now() WHERE account_id=$1",
    [user.user.id],
  );
  await status().expect(401);
  await db().query('UPDATE auth_password_resets SET consumed_at=NULL WHERE account_id=$1', [
    user.user.id,
  ]);
  await db().query("UPDATE auth_accounts SET status='disabled' WHERE id=$1", [user.user.id]);
  await status().expect(401);
});
it('validates recovery input and rejects untrusted browser origins', async () => {
  await api()
    .post('/api/v1/auth/password/status')
    .set(native())
    .send({ email: 'bad', resetToken: 'short' })
    .expect(400);
  await api()
    .post('/api/v1/auth/password/status')
    .set('x-inventory-client', 'web')
    .set('origin', 'https://untrusted.example')
    .send({ email: 'recovery-status@example.test', resetToken: newToken() })
    .expect(403);
});
