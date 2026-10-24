import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { notificationPageSchema, securityPageSchema } from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native, password } from '../../test/auth-fixture.js';
import { NotificationWorker } from './notification-worker.js';
const fixture = organizationFixture();
it('recognizes an installation without treating it as identity and routes tenant-safe alerts', async () => {
  const f = fixture(),
    signal = randomUUID();
  const worker = f.application().get(NotificationWorker);
  await worker.onModuleDestroy();
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [f.managerId]);
  const login = () =>
    f
      .api()
      .post('/api/v1/auth/login')
      .set({ ...native(), 'x-inventory-device': signal })
      .send({ email: 'viewer@org.test', password });
  const first = await login().expect(201);
  await login().expect(201);
  const legacy = await f.api().get('/api/v1/auth/sessions').set(native(f.viewerToken)).expect(200);
  expect(legacy.body.sessions[0]).not.toHaveProperty('deviceId');
  const recognized = await f
    .api()
    .get('/api/v1/auth/sessions?includeDevice=true')
    .set(native(f.viewerToken))
    .expect(200);
  expect(recognized.body.sessions[0].deviceId).toMatch(/^[a-f0-9-]{36}$/);
  await f
    .api()
    .get('/api/v1/auth/sessions?includeDevice=invalid')
    .set(native(f.viewerToken))
    .expect(400);
  const events = (
    await f
      .db()
      .query(
        "SELECT id,session_id FROM security_events WHERE event='login.new_device' AND request_id=$1",
        [first.headers['x-request-id']],
      )
  ).rows;
  expect(events).toHaveLength(1);
  expect(events[0].session_id).toBe(first.body.sessionId);
  const deliveries = (
    await f
      .db()
      .query(
        'SELECT recipient_id,audience,business_id FROM security_deliveries WHERE event_id=$1',
        [events[0].id],
      )
  ).rows;
  expect(deliveries).toHaveLength(3);
  expect(deliveries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ recipient_id: f.viewerId, audience: 'self', business_id: null }),
      expect.objectContaining({
        recipient_id: f.ownerId,
        audience: 'business-admin',
        business_id: f.a,
      }),
      expect.objectContaining({
        recipient_id: f.managerId,
        audience: 'platform-admin',
        business_id: null,
      }),
    ]),
  );
  expect(
    (await f.db().query('SELECT id FROM recognized_devices WHERE account_id=$1', [f.viewerId]))
      .rows,
  ).toHaveLength(2); // invitation + new marker
  await worker.flush();
  await worker.flush();
  const inbox = notificationPageSchema.parse(
    (await f.api().get('/api/v1/auth/security/notifications').set(native(f.ownerToken)).expect(200))
      .body,
  );
  const notification = inbox.notifications.find((n) => n.eventId === String(events[0].id))!;
  expect(notification).toBeDefined();
  const other = notificationPageSchema.parse(
    (await f.api().get('/api/v1/auth/security/notifications').set(native(f.otherToken)).expect(200))
      .body,
  );
  expect(other.notifications.some((n) => n.eventId === notification.eventId)).toBe(false);
  await f
    .api()
    .post(`/api/v1/auth/security/notifications/${notification.id}/read`)
    .set(native(f.otherToken))
    .expect(404);
  await f
    .api()
    .post(`/api/v1/auth/security/notifications/${notification.id}/read`)
    .set(native(f.ownerToken))
    .expect(201);
  await f
    .db()
    .query("UPDATE business_memberships SET role='viewer' WHERE business_id=$1 AND account_id=$2", [
      f.a,
      f.ownerId,
    ]);
  const revoked = notificationPageSchema.parse(
    (await f.api().get('/api/v1/auth/security/notifications').set(native(f.ownerToken)).expect(200))
      .body,
  );
  expect(revoked.notifications.some((n) => n.id === notification.id)).toBe(false);
  await f
    .api()
    .post(`/api/v1/auth/security/notifications/${notification.id}/read`)
    .set(native(f.ownerToken))
    .expect(404);
  await f
    .api()
    .post('/api/v1/auth/login')
    .set({ ...native(), 'x-inventory-device': signal })
    .send({ email: 'viewer@org.test', password: 'wrong' })
    .expect(401);
});
it('keeps public credential errors generic and failed patterns in the restricted audit trail', async () => {
  const f = fixture();
  for (const email of ['viewer@org.test', 'missing@org.test']) {
    const response = await f
      .api()
      .post('/api/v1/auth/login')
      .set(native())
      .send({ email, password: 'wrong' })
      .expect(401);
    expect(response.body.message).toBe('Authentication required or credentials invalid.');
    const event = (
      await f
        .db()
        .query('SELECT actor_id,subject_hash FROM security_events WHERE request_id=$1', [
          response.headers['x-request-id'],
        ])
    ).rows[0];
    expect(event.actor_id).toBeNull();
    expect(event.subject_hash).toMatch(/^[a-f0-9]{64}$/);
  }
  const events = securityPageSchema.parse(
    (await f.api().get('/api/v1/auth/security/events').set(native(f.viewerToken)).expect(200)).body,
  );
  expect(events.events.every((event) => event.actorId === f.viewerId)).toBe(true);
  await f.api().get('/api/v1/auth/security/platform/events').set(native(f.viewerToken)).expect(403);
});
