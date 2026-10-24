import { expect, it } from 'vitest';
import { diagnosticPageSchema } from '@inventory/contracts';
import { authFixture, native } from '../../test/auth-fixture.js';
import { NotificationWorker } from './notification-worker.js';
const f = authFixture();
it('correlates safe unexpected errors, restricts reads and expires diagnostics separately from audit', async () => {
  const user = await f.register('diagnostics@example.test');
  const worker = f.application().get(NotificationWorker);
  await worker.onModuleDestroy();
  await f.db()
    .query(`CREATE FUNCTION fail_preferences() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'password=secret token=private customer@example.test'; END; $$;
    CREATE TRIGGER fail_preferences BEFORE INSERT ON user_preferences FOR EACH ROW EXECUTE FUNCTION fail_preferences();`);
  let reference = '';
  try {
    const response = await f
      .api()
      .put('/api/v1/auth/settings')
      .set(native(user.token))
      .send({ version: 0, values: { appearance: 'dark' } })
      .expect(500);
    reference = String(response.headers['x-request-id']);
    expect(response.body.requestId).toBe(reference);
    expect(JSON.stringify(response.body)).not.toMatch(/password=|secret|private|customer@/);
    await expect
      .poll(
        async () =>
          (
            await f
              .db()
              .query('SELECT count(*)::int AS n FROM diagnostic_events WHERE request_id=$1', [
                reference,
              ])
          ).rows[0].n,
      )
      .toBe(1);
  } finally {
    await f
      .db()
      .query('DROP TRIGGER fail_preferences ON user_preferences; DROP FUNCTION fail_preferences()');
  }
  await f.api().get('/api/v1/auth/security/diagnostics').set(native(user.token)).expect(403);
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [user.user.id]);
  const result = diagnosticPageSchema.parse(
    (await f.api().get('/api/v1/auth/security/diagnostics').set(native(user.token)).expect(200))
      .body,
  );
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        requestId: reference,
        code: 'INTERNAL_ERROR',
        environment: 'test',
        actorId: user.user.id,
      }),
    ]),
  );
  expect(JSON.stringify(result)).not.toMatch(/password=|token=|customer@|secret/);
  const audits = (await f.db().query('SELECT count(*)::int AS n FROM security_events')).rows[0].n;
  await f.db().query("UPDATE diagnostic_events SET occurred_at=now()-interval '31 days'");
  await worker.flush();
  expect((await f.db().query('SELECT count(*)::int AS n FROM diagnostic_events')).rows[0].n).toBe(
    0,
  );
  expect((await f.db().query('SELECT count(*)::int AS n FROM security_events')).rows[0].n).toBe(
    audits,
  );
});
