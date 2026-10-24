import { randomUUID } from 'node:crypto';
import { beforeAll, expect, it } from 'vitest';
import { platformBusinessesSchema, platformBusinessDetailSchema } from '@inventory/contracts';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = organizationFixture();
const root = '/api/v1/auth/security/platform/businesses';
beforeAll(async () => {
  const f = fixture();
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [f.ownerId]);
});
it('requires a session and platform authority independently of business roles', async () => {
  const f = fixture();
  await f.api().get(root).expect(401);
  for (const token of [f.otherToken, f.managerToken, f.viewerToken]) {
    await f.api().get(root).set(native(token)).expect(403);
    await f.api().get(`${root}/${f.a}`).set(native(token)).expect(403);
  }
});
it('filters and paginates registrations without disclosing account data', async () => {
  const f = fixture();
  await f
    .db()
    .query(
      `INSERT INTO businesses(id,name) SELECT gen_random_uuid(),'Directory ' || n FROM generate_series(1,27) n`,
    );
  await f
    .db()
    .query(
      `INSERT INTO businesses(id,name,state) VALUES(gen_random_uuid(),'Literal%_ name','suspended')`,
    );
  const read = async (query: string) =>
    platformBusinessesSchema.parse(
      (await f.api().get(`${root}${query}`).set(native(f.ownerToken)).expect(200)).body,
    );
  const first = await read('?search=Directory');
  const second = await read('?search=Directory&offset=25');
  expect(first.businesses).toHaveLength(25);
  expect(first.hasMore).toBe(true);
  expect(second.businesses).toHaveLength(2);
  expect(second.hasMore).toBe(false);
  expect(new Set([...first.businesses, ...second.businesses].map((b) => b.id)).size).toBe(27);
  expect(first.total).toBe('27');
  const literal = await read('?search=%25_&state=suspended');
  expect(literal.businesses.map((b) => b.name)).toEqual(['Literal%_ name']);
  expect(JSON.stringify(first)).not.toMatch(/email|token|password|membership/i);
  for (const query of ['?offset=-1', '?offset=100001', '?state=deleted', '?unexpected=true'])
    await f.api().get(`${root}${query}`).set(native(f.ownerToken)).expect(400);
});
it('loads only the selected business locations with bounded independent pagination', async () => {
  const f = fixture();
  const read = async (id: string, offset = 0) =>
    platformBusinessDetailSchema.parse(
      (await f.api().get(`${root}/${id}?offset=${offset}`).set(native(f.ownerToken)).expect(200))
        .body,
    );
  const a = await read(f.a),
    b = await read(f.b);
  expect(a.business).toMatchObject({ storeCount: '1', warehouseCount: '1' });
  expect(b.business).toMatchObject({ storeCount: '1', warehouseCount: '0' });
  expect(a.locations.map((l) => l.id)).toEqual([f.storeA, f.warehouseA]);
  expect(b.locations.map((l) => l.id)).toEqual([f.storeB]);
  expect(a.locations.find((l) => l.id === f.warehouseA)?.storeId).toBe(f.storeA);
  await f
    .db()
    .query(
      `INSERT INTO stores(id,business_id,code,name,type) SELECT gen_random_uuid(),$1,'EXTRA-'||n,'Extra '||n,'store' FROM generate_series(1,26) n`,
      [f.a],
    );
  const first = await read(f.a),
    last = await read(f.a, 25);
  expect(first.locations).toHaveLength(25);
  expect(first.hasMore).toBe(true);
  expect(last.locations).toHaveLength(3);
  expect(last.hasMore).toBe(false);
  expect(new Set([...first.locations, ...last.locations].map((l) => l.id)).size).toBe(28);
  await f.api().get(`${root}/${randomUUID()}`).set(native(f.ownerToken)).expect(404);
  await f.api().get(`${root}/invalid`).set(native(f.ownerToken)).expect(400);
});
it('rechecks revoked platform authority on both directory and location requests', async () => {
  const f = fixture();
  await f.db().query('DELETE FROM platform_administrators WHERE account_id=$1', [f.ownerId]);
  await f.api().get(root).set(native(f.ownerToken)).expect(403);
  await f.api().get(`${root}/${f.a}`).set(native(f.ownerToken)).expect(403);
});
