import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { authFixture, native, password } from '../../test/auth-fixture.js';
const f = authFixture();
it('avoids account/FK lock cycles during cross-recipient logins and renewal/revocation races', async () => {
  const a = await f.register('race-a@example.test'),
    b = await f.register('race-b@example.test');
  await f
    .db()
    .query('INSERT INTO platform_administrators(account_id) VALUES($1),($2)', [
      a.user.id,
      b.user.id,
    ]);
  const sessions = await Promise.all(
    [a, b].map((user) =>
      f
        .api()
        .post('/api/v1/auth/login')
        .set({ ...native(), 'x-inventory-device': randomUUID() })
        .send({ email: user.user.email, password })
        .expect(201),
    ),
  );
  for (const session of sessions) {
    const responses = await Promise.all([
      f.api().post('/api/v1/auth/renew').set(native(session.body.token)),
      f.api().delete('/api/v1/auth/sessions').set(native(session.body.token)),
    ]);
    expect(responses.every((response) => [200, 201, 401].includes(response.status))).toBe(true);
  }
});
it('never reports another account session as revoked and keeps historical IDs after pruning', async () => {
  const a = await f.register('scope-a@example.test'),
    b = await f.register('scope-b@example.test');
  const other = await f
    .api()
    .delete(`/api/v1/auth/sessions/${b.sessionId}`)
    .set(native(a.token))
    .expect(200);
  expect(
    (
      await f
        .db()
        .query('SELECT id FROM security_events WHERE request_id=$1', [
          other.headers['x-request-id'],
        ])
    ).rowCount,
  ).toBe(0);
  await f.api().get('/api/v1/auth/session').set(native(b.token)).expect(200);
  const own = await f
    .api()
    .delete(`/api/v1/auth/sessions/${a.sessionId}`)
    .set(native(a.token))
    .expect(200);
  expect(
    (
      await f
        .db()
        .query('SELECT session_id FROM security_events WHERE request_id=$1', [
          own.headers['x-request-id'],
        ])
    ).rows[0].session_id,
  ).toBe(a.sessionId);
  await f.db().query('DELETE FROM auth_sessions WHERE id=$1', [a.sessionId]);
  expect(
    (
      await f
        .db()
        .query('SELECT session_id FROM security_events WHERE request_id=$1', [
          own.headers['x-request-id'],
        ])
    ).rows[0].session_id,
  ).toBe(a.sessionId);
});
