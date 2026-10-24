import { expect, it } from 'vitest';
import { policyRecordSchema } from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = organizationFixture();
it('versions tenant profiles with settings, rejects unsupported configuration and audits changes', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/settings`,
    h = native(f.ownerToken);
  const input = {
    version: 0,
    values: {
      enforced: { appearance: 'dark' },
      industry: { schemaVersion: 1, kind: 'wholesale', lowStockThreshold: '2.5' },
    },
  };
  await f.api().put(path).set(native(f.managerToken)).send(input).expect(403);
  await f.api().put(path).set(native(f.otherToken)).send(input).expect(404);
  await f
    .api()
    .put(path)
    .set(h)
    .send({ ...input, values: { industry: { ...input.values.industry, lotTracking: true } } })
    .expect(400);
  await f.api().put(path).set(h).send(input).expect(200);
  await f.api().put(path).set(h).send(input).expect(409);
  const saved = policyRecordSchema.parse((await f.api().get(path).set(h).expect(200)).body);
  expect(saved.values.industry).toEqual(input.values.industry);
  expect(saved.values.enforced.appearance).toBe('dark');
  const audit = (
    await f
      .db()
      .query(
        "SELECT after_data FROM organization_audit WHERE business_id=$1 AND action='settings.policy_changed'",
        [f.a],
      )
  ).rows[0];
  expect(audit.after_data.values.industry).toEqual(input.values.industry);
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [f.ownerId]);
  await f.api().put('/api/v1/auth/settings/platform').set(h).send(input).expect(400);
});
