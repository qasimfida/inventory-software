import { expect, it } from 'vitest';
import { authFixture, native, password } from '../../test/auth-fixture.js';
import { DatabaseService } from '../database/database.service.js';
import { issueRecovery } from './password-recovery.js';
import { tokenHash } from './secrets.js';
const f = authFixture();
const route = '/api/v1/auth/';
const newPassword = 'new correct horse battery staple';
const issue = (email: string) => issueRecovery(f.application().get(DatabaseService), email);

it('issues only hashed codes, replaces prior codes, consumes once and revokes all sessions', async () => {
  const user = await f.register('recovery@example.test');
  const oldCode = await issue(user.user.email);
  const code = await issue(user.user.email);
  expect(
    (await f.db().query('SELECT token_hash FROM auth_password_resets WHERE consumed_at IS NULL'))
      .rows,
  ).toEqual([{ token_hash: tokenHash(code) }]);
  const body = { email: user.user.email, password: newPassword, resetToken: code };
  await f
    .api()
    .post(`${route}password/reset`)
    .set(native())
    .send({ ...body, resetToken: oldCode })
    .expect(401);
  await f
    .api()
    .post(`${route}password/reset`)
    .set(native())
    .send({ ...body, password: 'short' })
    .expect(400);
  const results = await Promise.all(
    [1, 2].map(() => f.api().post(`${route}password/reset`).set(native()).send(body)),
  );
  expect(results.map((r) => r.status).sort()).toEqual([201, 401]);
  expect(results.find((r) => r.status === 201)!.body).toEqual({ ok: true });
  await f.api().get(`${route}session`).set(native(user.token)).expect(401);
  await f.api().post(`${route}renew`).set(native(user.token)).expect(401);
  await f
    .api()
    .post(`${route}login`)
    .set(native())
    .send({ email: user.user.email, password })
    .expect(401);
  await f
    .api()
    .post(`${route}login`)
    .set(native())
    .send({ email: user.user.email, password: newPassword })
    .expect(201);
});

it('denies expired, wrong-account and disabled recovery without disclosing account state', async () => {
  const user = await f.register('expired-recovery@example.test');
  const code = await issue(user.user.email);
  const body = { email: user.user.email, password: newPassword, resetToken: code };
  await f
    .api()
    .post(`${route}password/reset`)
    .set(native())
    .send({ ...body, email: 'unknown@example.test' })
    .expect(401);
  await f
    .db()
    .query(
      "UPDATE auth_password_resets SET created_at=now()-interval '1 hour',expires_at=now()-interval '1 second' WHERE token_hash=$1",
      [tokenHash(code)],
    );
  const expired = await f.api().post(`${route}password/reset`).set(native()).send(body).expect(401);
  const fresh = await issue(user.user.email);
  await f.db().query("UPDATE auth_accounts SET status='disabled' WHERE id=$1", [user.user.id]);
  const disabled = await f
    .api()
    .post(`${route}password/reset`)
    .set(native())
    .send({ ...body, resetToken: fresh })
    .expect(401);
  expect(disabled.body.message).toBe(expired.body.message);
  await expect(issue(user.user.email)).rejects.toThrow();
});

it('rolls back code consumption, password and revocation if a later transaction step fails', async () => {
  const user = await f.register('rollback-recovery@example.test');
  const code = await issue(user.user.email);
  await f.db()
    .query(`CREATE FUNCTION fail_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END; $$;
    CREATE TRIGGER fail_reset BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION fail_reset();`);
  try {
    await f
      .api()
      .post(`${route}password/reset`)
      .set(native())
      .send({ email: user.user.email, password: newPassword, resetToken: code })
      .expect(500);
    expect(
      (
        await f
          .db()
          .query('SELECT consumed_at FROM auth_password_resets WHERE token_hash=$1', [
            tokenHash(code),
          ])
      ).rows[0].consumed_at,
    ).toBeNull();
    await f.api().get(`${route}session`).set(native(user.token)).expect(200);
  } finally {
    await f.db().query('DROP TRIGGER fail_reset ON auth_sessions; DROP FUNCTION fail_reset()');
  }
  await f
    .api()
    .post(`${route}login`)
    .set(native())
    .send({ email: user.user.email, password })
    .expect(201);
  await f
    .api()
    .post(`${route}password/reset`)
    .set(native())
    .send({ email: user.user.email, password: newPassword, resetToken: code })
    .expect(201);
});

it('requires the browser CSRF boundary and applies credential throttling to recovery', async () => {
  const body = {
    email: 'reset-limit@example.test',
    password: newPassword,
    resetToken: 'a'.repeat(43),
  };
  await f.api().post(`${route}password/reset`).send(body).expect(403);
  for (let i = 0; i < 10; i++)
    await f.api().post(`${route}password/reset`).set(native()).send(body).expect(401);
  const limited = await f.api().post(`${route}password/reset`).set(native()).send(body).expect(429);
  expect(limited.headers['retry-after']).toBe('900');
  expect(JSON.stringify(limited.body)).not.toContain(body.resetToken);
});
