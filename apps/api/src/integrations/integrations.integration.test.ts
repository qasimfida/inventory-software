import { describe, it, expect } from 'vitest';
import { integrationStatusSchema } from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
describe('integration boundary', () => {
  const fixture = organizationFixture();
  it('returns honest status and permission-filtered navigation without secret configuration', async () => {
    const f = fixture(),
      path = `${f.root}/${f.a}/integrations`;
    await f.api().get(path).expect(401);
    await f.api().get(path).set(native(f.otherToken)).expect(404);
    const data = integrationStatusSchema.parse(
      (await f.api().get(path).set(native(f.viewerToken)).expect(200)).body,
    );
    expect(data.services.find((s) => s.id === 'ai')?.state).toBe('unconfigured');
    expect(data.navigation).not.toContain('Sales and receipts');
    expect(JSON.stringify(data)).not.toMatch(/AI_API_KEY|DATABASE_URL|password/i);
    await f
      .api()
      .post(`${path}/assistant`)
      .set(native(f.ownerToken))
      .send({ question: 'Where is inventory?', sql: 'SELECT *' })
      .expect(400);
    const unavailable = await f
      .api()
      .post(`${path}/assistant`)
      .set(native(f.ownerToken))
      .send({ question: 'Where is inventory?' })
      .expect(503);
    expect(unavailable.body.code).toBe('UNAVAILABLE');
  });
  it('enforces durable account rate limits without calling an unconfigured provider', async () => {
    const f = fixture(),
      path = `${f.root}/${f.a}/integrations/assistant`;
    for (let i = 0; i < 20; i++)
      await f
        .api()
        .post(path)
        .set(native(f.viewerToken))
        .send({ question: 'Navigation help' })
        .expect(503);
    const denied = await f
      .api()
      .post(path)
      .set(native(f.viewerToken))
      .send({ question: 'Navigation help' })
      .expect(429);
    expect(denied.headers['retry-after']).toBe('900');
  });
});
