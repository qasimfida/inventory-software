import { DatabaseService } from '../database/database.service.js';
import { expect, it } from 'vitest';
import { authFixture, native } from '../../test/auth-fixture.js';
import { NotificationWorker } from './notification-worker.js';
const f = authFixture();
it('persists failure attempts, recovers after restart and never duplicates inbox delivery', async () => {
  const user = await f.register('delivery@example.test');
  const worker = f.application().get(NotificationWorker);
  await worker.onModuleDestroy();
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [user.user.id]);
  const row = (
    await f.db().query('SELECT id FROM security_deliveries WHERE recipient_id=$1', [user.user.id])
  ).rows[0];
  await f.db()
    .query(`CREATE FUNCTION fail_inbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'secret must not escape'; END; $$;
    CREATE TRIGGER fail_inbox BEFORE INSERT ON security_inbox FOR EACH ROW EXECUTE FUNCTION fail_inbox();`);
  try {
    await worker.flush();
    const failed = (
      await f
        .db()
        .query(
          'SELECT state,attempts,failure_code,next_attempt_at>now() AS backoff FROM security_deliveries WHERE id=$1',
          [row.id],
        )
    ).rows[0];
    expect(failed).toEqual({
      state: 'pending',
      attempts: 1,
      failure_code: 'INBOX_WRITE_FAILED',
      backoff: true,
    });
    await worker.flush();
    expect(
      (await f.db().query('SELECT attempts FROM security_deliveries WHERE id=$1', [row.id])).rows[0]
        .attempts,
    ).toBe(1);
    await f
      .db()
      .query('UPDATE security_deliveries SET attempts=7,next_attempt_at=now() WHERE id=$1', [
        row.id,
      ]);
    await worker.flush();
    expect(
      (await f.db().query('SELECT state FROM security_deliveries WHERE id=$1', [row.id])).rows[0]
        .state,
    ).toBe('failed');
  } finally {
    await f.db().query('DROP TRIGGER fail_inbox ON security_inbox; DROP FUNCTION fail_inbox()');
  }
  await f
    .api()
    .post(`/api/v1/auth/security/deliveries/${row.id}/retry`)
    .set(native(user.token))
    .expect(201);
  const restarted = new NotificationWorker(f.application().get(DatabaseService));
  await Promise.all([restarted.flush(), restarted.flush()]);
  await worker.flush();
  expect(
    (
      await f
        .db()
        .query('SELECT count(*)::int AS n FROM security_inbox WHERE delivery_id=$1', [row.id])
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await f
        .db()
        .query(
          'SELECT state,delivered_at IS NOT NULL AS confirmed FROM security_deliveries WHERE id=$1',
          [row.id],
        )
    ).rows[0],
  ).toEqual({ state: 'delivered', confirmed: true });
  await f
    .api()
    .post(`/api/v1/auth/security/deliveries/${row.id}/retry`)
    .set(native(user.token))
    .expect(404);
});
it('shows interrupted final attempts and restricts retry and delivery diagnostics', async () => {
  const user = await f.register('delivery-denied@example.test');
  const row = (
    await f.db().query('SELECT id FROM security_deliveries WHERE recipient_id=$1', [user.user.id])
  ).rows[0];
  await f
    .db()
    .query(
      "UPDATE security_deliveries SET attempts=8,next_attempt_at=now()-interval '1 minute' WHERE id=$1",
      [row.id],
    );
  await f.application().get(NotificationWorker).flush();
  expect(
    (await f.db().query('SELECT state,failure_code FROM security_deliveries WHERE id=$1', [row.id]))
      .rows[0],
  ).toEqual({ state: 'failed', failure_code: 'DELIVERY_INTERRUPTED' });
  await f.api().get('/api/v1/auth/security/deliveries').set(native(user.token)).expect(403);
  await f
    .api()
    .post(`/api/v1/auth/security/deliveries/${row.id}/retry`)
    .set(native(user.token))
    .expect(403);
});
