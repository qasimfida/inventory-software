import { expect, it } from 'vitest';
import { settingsSnapshotSchema, policyRecordSchema } from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = organizationFixture();
const root = '/api/v1/auth/settings';
it('isolates preferences by authenticated account, rejects unsafe fields and detects stale writes', async () => {
  const f = fixture();
  const initial = await f.api().get(root).set(native(f.ownerToken)).expect(200);
  expect(settingsSnapshotSchema.parse(initial.body).preferences.version).toBe(0);
  await f
    .api()
    .put(root)
    .set(native(f.ownerToken))
    .send({
      version: 0,
      values: {
        appearance: 'dark',
        textSize: 'large',
        pagination: 'scroll',
        radius: 'circle',
        currency: 'PKR',
      },
    })
    .expect(200);
  const own = settingsSnapshotSchema.parse(
    (await f.api().get(root).set(native(f.ownerToken)).expect(200)).body,
  );
  const other = settingsSnapshotSchema.parse(
    (await f.api().get(root).set(native(f.otherToken)).expect(200)).body,
  );
  expect(own.preferences.values).toMatchObject({
    appearance: 'dark',
    pagination: 'scroll',
    radius: 'circle',
    currency: 'PKR',
  });
  expect(other.preferences.values).toEqual({});
  await f
    .api()
    .put(root)
    .set(native(f.ownerToken))
    .send({ version: 0, values: { appearance: 'light' } })
    .expect(409);
  for (const values of [
    { allowAnonymous: true },
    { appearance: 'invalid' },
    { currency: 'INVALID' },
  ])
    await f.api().put(root).set(native(f.ownerToken)).send({ version: 1, values }).expect(400);
  await f
    .api()
    .put(root)
    .set(native(f.ownerToken))
    .send({ version: 1, accountId: f.viewerId, values: {} })
    .expect(400);
  await f.api().get(root).expect(401);
});
it('enforces tenant and administrator policy boundaries, version concurrency and append-only audit', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/settings`,
    input = { version: 0, values: { enforced: { appearance: 'dark' } } };
  await f.api().put(path).set(native(f.otherToken)).send(input).expect(404);
  await f.api().put(path).set(native(f.managerToken)).send(input).expect(403);
  await f.api().put(`${root}/platform`).set(native(f.ownerToken)).send(input).expect(403);
  await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({ version: 0, values: { notifications: { notifyPlatformAdmins: false } } })
    .expect(400);
  const replies = await Promise.all(
    [1, 2].map(() => f.api().put(path).set(native(f.ownerToken)).send(input)),
  );
  expect(replies.map((r) => r.status).sort()).toEqual([200, 409]);
  const policy = policyRecordSchema.parse(
    (await f.api().get(path).set(native(f.viewerToken)).expect(200)).body,
  );
  expect(policy.values.enforced.appearance).toBe('dark');
  await f.api().get(`${f.root}/${f.b}/settings`).set(native(f.viewerToken)).expect(404);
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [f.ownerId]);
  await f.api().put(`${root}/platform`).set(native(f.ownerToken)).send(input).expect(200);
  await expect(
    f
      .db()
      .query("UPDATE security_events SET event='tampered' WHERE event='settings.platform_changed'"),
  ).rejects.toThrow();
  await expect(f.db().query('TRUNCATE security_events CASCADE')).rejects.toThrow();
  await f.api().get('/api/v1/auth/security/platform/events').set(native(f.viewerToken)).expect(403);
});
