import { beforeAll, expect, it, vi } from 'vitest';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
import {
  companyProfileSchema,
  onlineSettingsResultSchema,
  storefrontWorkspaceSchema,
  publicStorefrontSchema,
} from '@inventory/contracts';
import { StorefrontWorker } from './storefront-worker.js';
beforeAll(() => vi.stubEnv('STOREFRONT_MEDIA_ORIGINS', 'https://media.example.com'));
const fixture = stockFixture();
const slug = 'test-published-store';
const publicPath = `/api/v1/public/storefronts/${slug}`;
it('enforces dedicated permissions, prerequisites, tenant scope, and optimistic settings versions', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/storefront`;
  for (const token of [f.viewerToken]) await f.api().get(path).set(native(token)).expect(403);
  await f.api().get(path).set(native(f.managerToken)).expect(200);
  await f.api().get(path).expect(401);
  await f.api().get(path).set(native(f.otherToken)).expect(404);
  const assignment = {
    role: 'custom',
    state: 'active',
    version: 1,
    permissions: ['onlineStore.manage'],
  };
  await f
    .api()
    .patch(`${f.root}/${f.a}/members/${f.viewerId}`)
    .set(native(f.ownerToken))
    .send({ ...assignment, scope: { storeId: f.storeA, warehouseId: null } })
    .expect(400);
  await f
    .api()
    .patch(`${f.root}/${f.a}/members/${f.viewerId}`)
    .set(native(f.ownerToken))
    .send(assignment)
    .expect(200);
  await f.api().get(path).set(native(f.viewerToken)).expect(200);
  const config = {
    slug,
    name: 'Public fixture',
    storeId: f.storeA,
    currency: 'USD',
    contact: 'Contact fixture',
    fulfillment: 'pickup',
    returnPolicy: 'Return unopened items within seven days.',
    version: 0,
    enabled: true,
  };
  await f.api().put(path).set(native(f.ownerToken)).send(config).expect(400);
  await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({ ...config, enabled: false })
    .expect(200);
  await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({ ...config, enabled: false })
    .expect(409);
  const managed = await f
    .api()
    .get(`${f.root}/${f.a}/stores/${f.storeA}/online-store/settings`)
    .set(native(f.ownerToken))
    .expect(200);
  expect(onlineSettingsResultSchema.parse(managed.body).settings?.allowedImageHosts).toEqual([
    'media.example.com',
  ]);
  await f.api().get(publicPath).expect(404);
  await f
    .api()
    .put(`${f.root}/${f.a}/settings`)
    .set(native(f.ownerToken))
    .send({
      version: 0,
      values: {
        company: companyProfileSchema.parse({
          displayName: 'Fixture company',
          address: 'Fixture address',
          transactionCurrency: 'USD',
          taxBasisPoints: 0,
        }),
      },
    })
    .expect(200);
  await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({ ...config, version: 1 })
    .expect(200);
  await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({ ...config, storeId: f.storeB, version: 2 })
    .expect(409);
});
it('publishes only ready allowlisted data, never stock/cash effects, and keeps sold-out separate', async () => {
  const f = fixture(),
    root = `${f.root}/${f.a}`,
    path = `${root}/storefront`,
    h = native(f.ownerToken);
  const category = (
    await f.api().post(`${root}/categories`).set(h).send({ name: 'Public category' }).expect(201)
  ).body;
  await f
    .api()
    .patch(`${root}/products/${f.variantId}`)
    .set(h)
    .send({
      name: 'Public item',
      sku: 'STOCK',
      description: 'A public description with enough detail.',
      images: ['https://media.example.com/item.png'],
      categoryId: category.id,
      version: 1,
    })
    .expect(200);
  await f
    .api()
    .post(`${root}/prices`)
    .set(h)
    .send({
      variantId: f.variantId,
      currency: 'USD',
      unitPrice: '12',
      startsAt: '2020-01-01T00:00:00Z',
    })
    .expect(201);
  const customer = (
    await f
      .api()
      .post(`${root}/customers`)
      .set(h)
      .send({ storeId: f.storeA, code: 'PRIVATE', name: 'Private customer', currency: 'USD' })
      .expect(201)
  ).body;
  await f
    .api()
    .post(`${root}/prices`)
    .set(h)
    .send({
      variantId: f.variantId,
      storeId: f.storeA,
      customerId: customer.id,
      currency: 'USD',
      unitPrice: '1',
      startsAt: '2020-01-01T00:00:00Z',
    })
    .expect(201);
  const productId = (
    await f.db().query('SELECT product_id FROM catalog_variants WHERE id=$1', [f.variantId])
  ).rows[0].product_id;
  await f
    .db()
    .query(
      "INSERT INTO storage_locations(id,business_id,warehouse_id,name,code) VALUES($1,$2,$1,'Root','ROOT') ON CONFLICT DO NOTHING",
      [f.warehouseA, f.a],
    );
  await f
    .db()
    .query(
      'INSERT INTO stock_balances(business_id,variant_id,warehouse_id,location_id) VALUES($1,$2,$3,$3)',
      [f.a, f.variantId, f.warehouseA],
    );
  await f.api().put(`${path}/listings`).set(h).send({ productId, version: 0 }).expect(200);
  const read = async () =>
    storefrontWorkspaceSchema.parse((await f.api().get(path).set(h).expect(200)).body);
  let listing = (await read()).listings[0]!;
  expect(listing.state).toBe('ready');
  const counts = async () =>
    (
      await f
        .db()
        .query(
          'SELECT (SELECT count(*) FROM stock_movements WHERE business_id=$1)::int AS stock, (SELECT count(*) FROM cash_entries WHERE business_id=$1)::int AS cash',
          [f.a],
        )
    ).rows[0];
  const before = await counts();
  await f
    .api()
    .post(`${path}/listings/${listing.id}`)
    .set(h)
    .send({ version: listing.version, action: 'publish' })
    .expect(201);
  await f
    .api()
    .post(`${path}/listings/${listing.id}`)
    .set(h)
    .send({ version: listing.version, action: 'publish' })
    .expect(409);
  const response = await f.api().get(publicPath).expect(200);
  expect(response.headers['cache-control']).toContain('no-store');
  const data = publicStorefrontSchema.parse(response.body);
  expect(data.items).toHaveLength(1);
  expect(data.items[0]).toMatchObject({
    title: 'Public item',
    availability: 'sold_out',
    variants: [{ totalMinor: '1200', currency: 'USD' }],
  });
  expect(Object.keys(data.items[0]!)).toEqual(
    expect.arrayContaining(['id', 'title', 'description', 'images', 'availability', 'variants']),
  );
  expect(JSON.stringify(data)).not.toMatch(
    /businessId|cost|customerId|reserved|on_hand|actor|permissions|password/,
  );
  expect(await counts()).toEqual(before);
  let settings = (await read()).settings!;
  await f
    .api()
    .put(path)
    .set(h)
    .send({ ...settings, hideSoldOut: true })
    .expect(200);
  expect((await f.api().get(publicPath).expect(200)).body.items).toEqual([]);
  settings = (await read()).settings!;
  await f
    .api()
    .put(path)
    .set(h)
    .send({ ...settings, hideSoldOut: false })
    .expect(200);
  listing = (await read()).listings[0]!;
  await f
    .api()
    .post(`${path}/listings/${listing.id}`)
    .set(h)
    .send({ version: listing.version, action: 'pause' })
    .expect(201);
  expect((await f.api().get(publicPath).expect(200)).body.items).toEqual([]);
  listing = (await read()).listings[0]!;
  await f
    .api()
    .post(`${path}/listings/${listing.id}`)
    .set(h)
    .send({ version: listing.version, action: 'publish' })
    .expect(201);
});
it('durably revalidates content, emits one delisting event, requires explicit republish and disables public reads immediately', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/storefront`,
    h = native(f.ownerToken);
  await f.db().query("UPDATE catalog_products SET description='' WHERE business_id=$1", [f.a]);
  await f.db().query('UPDATE storefront_settings SET next_check=now() WHERE business_id=$1', [f.a]);
  await f.application().get(StorefrontWorker).flush();
  const read = async () =>
    storefrontWorkspaceSchema.parse((await f.api().get(path).set(h).expect(200)).body);
  let data = await read();
  expect(data.listings[0]?.state).toBe('needs_changes');
  expect((await f.api().get(publicPath).expect(200)).body.items).toEqual([]);
  await f
    .db()
    .query(
      "UPDATE catalog_products SET description='Restored public product description.' WHERE business_id=$1",
      [f.a],
    );
  data = await read();
  expect(data.listings[0]?.state).toBe('ready');
  expect((await f.api().get(publicPath).expect(200)).body.items).toEqual([]);
  expect(
    (
      await f
        .db()
        .query(
          "SELECT count(*)::int AS n FROM organization_audit WHERE business_id=$1 AND action='storefront.transition' AND before_data->>'state'='active' AND after_data->>'state'='needs_changes'",
          [f.a],
        )
    ).rows[0].n,
  ).toBe(1);
  const listing = data.listings[0]!;
  await f
    .api()
    .post(`${path}/listings/${listing.id}`)
    .set(h)
    .send({ version: listing.version, action: 'remove' })
    .expect(201);
  data = await read();
  expect(data.listings[0]?.state).toBe('delisted');
  await f
    .api()
    .post(`${path}/listings/${listing.id}`)
    .set(h)
    .send({ version: data.listings[0]!.version, action: 'publish' })
    .expect(409);
  await f
    .api()
    .put(path)
    .set(h)
    .send({ ...data.settings, enabled: false })
    .expect(200);
  await f.api().get(publicPath).expect(404);
  await f.api().get(`${publicPath}?limit=100000`).expect(400);
  await f.api().post(publicPath).send({ action: 'publish' }).expect(404);
});

it('limits unauthenticated public reads independently of staff sessions', async () => {
  const f = fixture();
  let status = 200;
  for (let n = 0; n < 61 && status !== 429; n++) status = (await f.api().get(publicPath)).status;
  expect(status).toBe(429);
  await f.api().get(`${f.root}/${f.a}/storefront`).set(native(f.ownerToken)).expect(200);
});

it('suggests business profile and active-store defaults without changing online overrides', async () => {
  const f = fixture();
  const response = await f
    .api()
    .get(`${f.root}/${f.a}/storefront`)
    .set(native(f.ownerToken))
    .expect(200);
  const data = storefrontWorkspaceSchema.parse(response.body);
  expect(data.defaults).toMatchObject({
    name: 'Fixture company',
    contact: 'Fixture address',
    currency: 'USD',
    storeId: f.storeA,
  });
  expect(data.defaults.slug).toMatch(/^fixture-company-/);
  expect(data.settings?.name).toBe('Public fixture');
  expect(data.settings?.enabled).toBe(false);
});
