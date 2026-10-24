import { expect, it } from 'vitest';
import { authResponseSchema } from '@inventory/contracts';
import { authFixture, native, password } from '../../test/auth-fixture.js';

const { api, invite, register, db } = authFixture();
const route = '/api/v1/auth/';

it('denies unauthenticated requests and accepts a single-use invitation with hashed credentials', async () => {
  await api().get(`${route}session`).expect(401);
  const email = 'onboarding@example.test';
  const invitationToken = await invite(email);
  await api()
    .post(`${route}invitations/accept`)
    .set(native())
    .send({ email, password: 'short', invitationToken })
    .expect(400);
  const response = await api()
    .post(`${route}invitations/accept`)
    .set(native())
    .send({ email, password, invitationToken })
    .expect(201);
  const session = authResponseSchema.parse(response.body);
  await api().get(`${route}session`).set(native(session.token)).expect(200);
  const stored = (
    await db().query('SELECT password_hash FROM auth_accounts WHERE email=$1', [email])
  ).rows[0];
  expect(stored.password_hash).toMatch(/^scrypt-v1\$/);
  expect(stored.password_hash).not.toContain(password);
  const tokens = (
    await db().query('SELECT token_hash FROM auth_sessions WHERE id=$1', [session.sessionId])
  ).rows;
  expect(tokens[0].token_hash).not.toBe(session.token);
  await api()
    .post(`${route}invitations/accept`)
    .set(native())
    .send({ email, password, invitationToken })
    .expect(401);
});

it('uses generic invalid-credential errors and denies disabled accounts and expired invitations', async () => {
  const session = await register('credentials@example.test');
  for (const email of ['credentials@example.test', 'unknown@example.test']) {
    const response = await api()
      .post(`${route}login`)
      .set(native())
      .send({ email, password: 'wrong' })
      .expect(401);
    expect(response.body.code).toBe('UNAUTHENTICATED');
  }
  await db().query("UPDATE auth_accounts SET status='disabled' WHERE id=$1", [session.user.id]);
  await api().get(`${route}session`).set(native(session.token)).expect(401);
  await api()
    .post(`${route}login`)
    .set(native())
    .send({ email: session.user.email, password })
    .expect(401);
  const email = 'expired-invite@example.test';
  const invitationToken = await invite(email);
  await db().query(
    "UPDATE auth_invitations SET expires_at=now()-interval '1 second' WHERE email=$1",
    [email],
  );
  await api()
    .post(`${route}invitations/accept`)
    .set(native())
    .send({ email, password, invitationToken })
    .expect(401);
});

it('rotates tokens once under concurrent renewal and enforces idle and absolute expiration', async () => {
  const session = await register('renew@example.test');
  const results = await Promise.all(
    [1, 2].map(() => api().post(`${route}renew`).set(native(session.token)).send({})),
  );
  expect(results.map((result) => result.status).sort()).toEqual([201, 401]);
  const renewed = authResponseSchema.parse(results.find((result) => result.status === 201)!.body);
  expect(renewed.token).not.toBe(session.token);
  expect(renewed.absoluteExpiresAt).toBe(session.absoluteExpiresAt);
  await api().get(`${route}session`).set(native(session.token)).expect(401);
  await db().query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1", [
    session.sessionId,
  ]);
  await api().get(`${route}session`).set(native(renewed.token)).expect(401);
  await api().post(`${route}renew`).set(native(renewed.token)).send({}).expect(401);
  const other = await register('absolute@example.test');
  await db().query(
    "UPDATE auth_sessions SET expires_at=now()-interval '1 second',absolute_expires_at=now()-interval '1 second' WHERE id=$1",
    [other.sessionId],
  );
  await api().get(`${route}session`).set(native(other.token)).expect(401);
});

it('isolates session ownership and revokes individual and all active sessions', async () => {
  const first = await register('sessions@example.test');
  const foreign = await register('foreign@example.test');
  const second = authResponseSchema.parse(
    (
      await api()
        .post(`${route}login`)
        .set(native())
        .send({ email: first.user.email, password })
        .expect(201)
    ).body,
  );
  const list = await api().get(`${route}sessions`).set(native(first.token)).expect(200);
  expect(list.body.sessions).toHaveLength(2);
  expect(JSON.stringify(list.body)).not.toContain(first.token);
  await api().delete(`${route}sessions/${foreign.sessionId}`).set(native(first.token)).expect(200);
  await api().get(`${route}session`).set(native(foreign.token)).expect(200);
  await api().delete(`${route}sessions/${second.sessionId}`).set(native(first.token)).expect(200);
  await api().get(`${route}session`).set(native(second.token)).expect(401);
  await api().delete(`${route}sessions`).set(native(first.token)).expect(200);
  await api().post(`${route}renew`).set(native(first.token)).expect(401);
  await api().post(`${route}logout`).set(native(foreign.token)).expect(201);
  await api().get(`${route}session`).set(native(foreign.token)).expect(401);
});

it('uses HttpOnly cookies, rejects CSRF and prevents switching session transports', async () => {
  const user = await register('browser@example.test');
  const body = { email: user.user.email, password };
  await api().post(`${route}login`).send(body).expect(403);
  await api()
    .post(`${route}login`)
    .set('origin', 'https://attacker.test')
    .set('x-inventory-client', 'web')
    .send(body)
    .expect(403);
  const response = await api()
    .post(`${route}login`)
    .set('origin', 'http://localhost:5173')
    .set('x-inventory-client', 'web')
    .send(body)
    .expect(201);
  expect(response.body.token).toBeUndefined();
  const cookie = (response.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith('inventory_session='),
  )!;
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Strict');
  const rawCookie = cookie.split(';')[0]!;
  await api().get(`${route}session`).set('cookie', rawCookie).expect(200);
  await api().post(`${route}logout`).set('cookie', rawCookie).expect(403);
  await api()
    .get(`${route}session`)
    .set(native(rawCookie.split('=')[1]))
    .expect(401);
  await api().get(`${route}session`).set('cookie', `inventory_session=${user.token}`).expect(401);
  await api()
    .post(`${route}logout`)
    .set('cookie', rawCookie)
    .set('origin', 'http://localhost:5173')
    .set('x-inventory-client', 'web')
    .expect(201);
  await api().get(`${route}session`).set('cookie', rawCookie).expect(401);
});

it('enforces shared database rate limits before hashing and does not trust forwarded IPs', async () => {
  for (let index = 0; index < 10; index++) {
    await api()
      .post(`${route}login`)
      .set(native())
      .set('x-forwarded-for', `192.0.2.${index}`)
      .send({ email: 'throttled@example.test', password: 'invalid' })
      .expect(401);
  }
  const response = await api()
    .post(`${route}login`)
    .set(native())
    .send({ email: 'throttled@example.test', password: 'invalid' })
    .expect(429);
  expect(response.headers['retry-after']).toBe('900');
  expect(response.body.code).toBe('RATE_LIMITED');
});

it('caps active sessions when a new login succeeds', async () => {
  const account = await register('session-cap@example.test');
  await db().query(
    `INSERT INTO auth_sessions(id,account_id,token_hash,transport,expires_at,absolute_expires_at)
    SELECT gen_random_uuid(),$1,md5(random()::text),'bearer',now()+interval '30 minutes',now()+interval '12 hours'
    FROM generate_series(1,12)`,
    [account.user.id],
  );
  await api()
    .post(`${route}login`)
    .set(native())
    .send({ email: account.user.email, password })
    .expect(201);
  const remaining = await db().query(
    'SELECT count(*)::integer AS count FROM auth_sessions WHERE account_id=$1 AND revoked_at IS NULL',
    [account.user.id],
  );
  expect(remaining.rows[0].count).toBe(10);
});
