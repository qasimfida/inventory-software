import { beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
import { onlineStoreSettingsSchema, listingPageSchema } from '@inventory/contracts';
beforeAll(() => vi.stubEnv('STOREFRONT_MEDIA_ORIGINS', 'https://media.example.com'));
const fixture = stockFixture();
const path = () => {
  const f = fixture();
  return `${f.root}/${f.a}/stores/${f.storeA}/online-store`;
};
it('isolates read/manage permissions and validates store ownership', async () => {
  const f = fixture();
  await f.api().get(`${path()}/settings`).set(native(f.ownerToken)).expect(200);
  await f.api().get(`${path()}/settings`).set(native(f.viewerToken)).expect(403);
  await f.api().get(`${path()}/settings`).set(native(f.otherToken)).expect(404);
  await f.api().get(`${path()}/settings`).expect(401);
  await f
    .api()
    .get(`${f.root}/${f.a}/stores/${f.storeB}/online-store/settings`)
    .set(native(f.ownerToken))
    .expect(404);
});
it('persists structured settings with idempotency and optimistic versions', async () => {
  const f = fixture();
  const settings = onlineStoreSettingsSchema.parse({
    businessId: f.a,
    storeId: f.storeA,
    enabled: false,
    status: 'configured',
    name: 'Managed store',
    slug: 'managed-store',
    currency: 'USD',
    contact: { email: 'store@example.com', phone: '', address: 'Public address' },
    fulfillment: {
      pickup: {
        enabled: true,
        locationId: f.storeA,
        instructions: 'Collect at reception',
        hours: '',
      },
      cashOnDelivery: false,
      manualBankTransfer: { enabled: false, instructions: '' },
    },
    returnPolicy: 'Return unopened goods within seven days.',
    shippingPolicy: '',
    stockSources: [f.warehouseA],
    safetyBuffer: '2',
    soldOutBehavior: 'show',
    allowedImageHosts: ['media.example.com'],
    version: 0,
  });
  const input = { action: 'settings', settings, idempotencyKey: randomUUID() };
  await f.api().post(`${path()}/commands`).set(native(f.ownerToken)).send(input).expect(201);
  await f.api().post(`${path()}/commands`).set(native(f.ownerToken)).send(input).expect(201);
  expect(
    (await f.api().get(`${path()}/settings`).set(native(f.ownerToken))).body.settings.version,
  ).toBe(1);
  const conflict = await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send({ ...input, idempotencyKey: randomUUID() })
    .expect(409);
  expect(conflict.body.code).toBe('STOREFRONT_CHANGED');
  await f.api().post(`${path()}/commands`).set(native(f.managerToken)).send(input).expect(403);
  await f.api().get(`${path()}/check-slug?slug=api`).set(native(f.ownerToken)).expect(400);
  const draft = {
    ...settings,
    version: 1,
    contact: { email: '', phone: '', address: '' },
    returnPolicy: '',
  };
  await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send({ action: 'settings', settings: draft, idempotencyKey: randomUUID() })
    .expect(201);
  const legacy = await f
    .api()
    .get(`${f.root}/${f.a}/storefront`)
    .set(native(f.ownerToken))
    .expect(200);
  expect(legacy.body.settings.contact).toBe('');
  expect(legacy.body.prerequisites).toContain('Add public contact details');
  await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send({ action: 'enable', version: 2, idempotencyKey: randomUUID() })
    .expect(409);
  await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send({
      action: 'settings',
      settings: { ...settings, version: 2 },
      idempotencyKey: randomUUID(),
    })
    .expect(201);
});
it('selects once with per-item results, filters structured issues, and records history', async () => {
  const f = fixture(),
    input = {
      action: 'select',
      items: [
        { productId: f.variantId, variantId: null },
        { productId: randomUUID(), variantId: null },
      ],
      idempotencyKey: randomUUID(),
    };
  const result = await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send(input)
    .expect(201);
  expect(result.body.items.map((i: { ok: boolean }) => i.ok)).toEqual([true, false]);
  const again = await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send(input)
    .expect(201);
  expect(again.body).toEqual(result.body);
  const page = listingPageSchema.parse(
    (await f.api().get(`${path()}/listings?issue=NO_IMAGE`).set(native(f.ownerToken)).expect(200))
      .body,
  );
  expect(page.items).toHaveLength(1);
  expect(page.counts.needs_changes).toBe(1);
  const item = page.items[0]!;
  expect(
    (
      await f
        .api()
        .get(`${path()}/listings/${item.id}/history`)
        .set(native(f.ownerToken))
        .expect(200)
    ).body.length,
  ).toBe(2);
  const publish = await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send({
      action: 'publish',
      items: [{ id: item.id, version: item.version }],
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  expect(publish.body.items[0].code).toBe('LISTING_TRANSITION_INVALID');
  const removed = await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.ownerToken))
    .send({
      action: 'remove',
      items: [{ id: item.id, version: item.version }],
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  expect(removed.body.ok).toBe(true);
  expect(
    (await f.api().get(`${path()}/listings`).set(native(f.ownerToken))).body.items,
  ).toHaveLength(0);
});
it('revalidates committed changes, preserves paused intent, deduplicates notifications and keeps stock separate', async () => {
  const f = fixture(),
    h = native(f.ownerToken),
    root = `${f.root}/${f.a}`;
  const { companyProfileSchema } = await import('@inventory/contracts');
  await f
    .api()
    .put(`${root}/settings`)
    .set(h)
    .send({
      version: 0,
      values: {
        company: companyProfileSchema.parse({
          displayName: 'Management company',
          address: 'Company address',
        }),
      },
    })
    .expect(200);
  const category = (
    await f.api().post(`${root}/categories`).set(h).send({ name: 'Online category' }).expect(201)
  ).body;
  await f
    .api()
    .patch(`${root}/products/${f.variantId}`)
    .set(h)
    .send({
      name: 'Online item',
      sku: 'STOCK',
      description: 'A complete online product description.',
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
      endsAt: '2030-01-01T00:00:00Z',
    })
    .expect(201);
  await f
    .api()
    .post(`${root}/stock/movements`)
    .set(h)
    .send({
      variantId: f.variantId,
      unitId: f.unitId,
      warehouseId: f.warehouseA,
      type: 'opening',
      quantity: '10',
      reason: 'Opening online fixture',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const cmd = async (input: Record<string, unknown>) =>
    (
      await f
        .api()
        .post(`${path()}/commands`)
        .set(h)
        .send({ ...input, idempotencyKey: randomUUID() })
        .expect(201)
    ).body;
  const config = async () =>
    (await f.api().get(`${path()}/settings`).set(h).expect(200)).body.settings;
  const listing = async () =>
    listingPageSchema.parse((await f.api().get(`${path()}/listings`).set(h).expect(200)).body)
      .items[0]!;
  await cmd({ action: 'enable', version: (await config()).version });
  await cmd({ action: 'select', items: [{ productId: f.variantId, variantId: null }] });
  let item = await listing();
  expect(item.status).toBe('ready');
  expect(
    (await cmd({ action: 'publish', items: [{ id: item.id, version: item.version }] })).ok,
  ).toBe(true);
  item = await listing();
  await cmd({ action: 'pause', items: [{ id: item.id, version: item.version }] });
  const impact = (
    await f.api().get(`${path()}/image-host-impact?host=media.example.com`).set(h).expect(200)
  ).body;
  expect(impact.count).toBe(1);
  // Allow removal while disabled, then restore sources and explicitly enable.
  await cmd({ action: 'disable', version: (await config()).version });
  await cmd({
    action: 'remove-host',
    host: 'media.example.com',
    version: (await config()).version,
  });
  expect((await listing()).status).toBe('needs_changes');
  const count = async () =>
    (
      await f
        .db()
        .query(
          "SELECT count(*)::int AS n FROM organization_audit WHERE business_id=$1 AND action='storefront.readiness_batch'",
          [f.a],
        )
    ).rows[0].n;
  const before = await count();
  await cmd({ action: 'validate', all: true, items: [] });
  expect(await count()).toBe(before);
  await cmd({ action: 'add-host', host: 'media.example.com', version: (await config()).version });
  expect((await listing()).status).toBe('paused');
  await cmd({ action: 'enable', version: (await config()).version });
  item = await listing();
  await cmd({ action: 'resume', items: [{ id: item.id, version: item.version }] });
  const { StorefrontWorker } = await import('./storefront-worker.js');
  const flush = async () => {
    await f
      .db()
      .query('UPDATE storefront_settings SET next_check=now() WHERE business_id=$1', [f.a]);
    await f.application().get(StorefrontWorker).flush();
  };
  // Transactional deduplication: repeated edits enqueue one product, not one job per edit.
  await f.db().query("UPDATE catalog_products SET description='' WHERE business_id=$1", [f.a]);
  await f.db().query("UPDATE catalog_products SET description='short' WHERE business_id=$1", [f.a]);
  expect(
    (
      await f
        .db()
        .query('SELECT count(*)::int AS n FROM storefront_revalidation WHERE business_id=$1', [f.a])
    ).rows[0].n,
  ).toBe(1);
  await flush();
  expect((await listing()).status).toBe('needs_changes');
  await f
    .db()
    .query(
      "UPDATE catalog_products SET description='A repaired complete description.' WHERE business_id=$1",
      [f.a],
    );
  await flush();
  expect((await listing()).status).toBe('ready');
  // Every owning table invalidates transactionally; rollbacks leave no intents.
  for (const table of [
    'catalog_products',
    'catalog_variants',
    'catalog_categories',
    'catalog_units',
    'warehouses',
    'stores',
    'settings_policies',
  ]) {
    await f
      .db()
      .query(
        `UPDATE ${table} SET ${table === 'settings_policies' ? 'version=version' : table === 'price_entries' ? 'unit_price=unit_price' : 'name=name'} WHERE business_id=$1`,
        [f.a],
      );
    expect(
      (
        await f
          .db()
          .query('SELECT count(*)::int AS n FROM storefront_revalidation WHERE business_id=$1', [
            f.a,
          ])
      ).rows[0].n,
      table,
    ).toBeGreaterThan(0);
    await flush();
  }
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
  try {
    await f
      .db()
      .query('UPDATE storefront_settings SET next_full_check=now() WHERE business_id=$1', [f.a]);
    await flush();
    expect((await listing()).issues.map((i) => i.code)).toContain('PRICE_MISSING');
  } finally {
    vi.useRealTimers();
  }
  await f
    .db()
    .query('UPDATE storefront_settings SET next_full_check=now() WHERE business_id=$1', [f.a]);
  await flush();
  item = await listing();
  await cmd({ action: 'publish', items: [{ id: item.id, version: item.version }] });
  await f
    .api()
    .post(`${root}/stock/movements`)
    .set(h)
    .send({
      variantId: f.variantId,
      unitId: f.unitId,
      warehouseId: f.warehouseA,
      type: 'sale',
      quantity: '10',
      reason: 'Fixture stock exhaustion',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  await flush();
  item = await listing();
  expect(item.status).toBe('active');
  expect(item.availability).toBe('SOLD_OUT');
  const journal = (
    await f
      .db()
      .query(
        'SELECT sum(quantity_delta)::text AS amount FROM stock_movements WHERE business_id=$1',
        [f.a],
      )
  ).rows[0];
  expect(Number(journal.amount)).toBe(0);
  const publicData = (await f.api().get('/api/v1/public/storefronts/managed-store').expect(200))
    .body;
  expect(publicData.items[0].availability).toBe('sold_out');
  expect(JSON.stringify(publicData)).not.toMatch(/cost|structured_issues|reserved|safetyBuffer/);
  await f.db().query("UPDATE catalog_products SET state='archived' WHERE business_id=$1", [f.a]);
  await flush();
  expect((await listing()).issues.map((i) => i.code)).toContain('PRODUCT_ARCHIVED');
  await f.db().query("UPDATE catalog_products SET state='active' WHERE business_id=$1", [f.a]);
  await flush();
});
it('resets legacy online overrides to inherited product fields without mutating the catalog', async () => {
  const f = fixture(),
    h = native(f.ownerToken);
  const page = await f.api().get(`${path()}/listings`).set(h).expect(200);
  const item = page.body.items[0];
  await f
    .db()
    .query('UPDATE channel_listings SET overrides=$1 WHERE business_id=$2 AND id=$3', [
      JSON.stringify({ title: 'Legacy title' }),
      f.a,
      item.id,
    ]);
  const before = await f.api().get(`${path()}/listings/${item.id}`).set(h).expect(200);
  const result = await f
    .api()
    .post(`${path()}/commands`)
    .set(h)
    .send({
      action: 'overrides',
      id: item.id,
      version: before.body.listing.version,
      overrides: { title: null, description: null, images: null, price: null, visible: true },
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  expect(result.body.ok).toBe(true);
  const after = await f.api().get(`${path()}/listings/${item.id}`).set(h).expect(200);
  expect(after.body.preview.source.title).toBe(after.body.preview.inherited.title);
  expect(after.body.preview.source.title).not.toBe('Legacy title');
});

it('supports scoped price overrides, currency revalidation, same-business store isolation, and rate limits', async () => {
  const f = fixture(),
    h = native(f.ownerToken),
    root = `${f.root}/${f.a}`;
  const config = (await f.api().get(`${path()}/settings`).set(h).expect(200)).body.settings;
  let item = listingPageSchema.parse(
    (await f.api().get(`${path()}/listings`).set(h).expect(200)).body,
  ).items[0]!;
  const command = async (body: Record<string, unknown>, endpoint = path()) =>
    (
      await f
        .api()
        .post(`${endpoint}/commands`)
        .set(h)
        .send({ ...body, idempotencyKey: randomUUID() })
        .expect(201)
    ).body;
  await command({
    action: 'overrides',
    id: item.id,
    version: item.version,
    overrides: { ...item.overrides, price: { unitPrice: '20', currency: 'USD' } },
  });
  item = listingPageSchema.parse((await f.api().get(`${path()}/listings`).set(h)).body).items[0]!;
  expect(item.issues.map((i) => i.code)).toContain('OVERRIDE_DIFFERS_FROM_POS_PRICE');
  await command({ action: 'publish', items: [{ id: item.id, version: item.version }] });
  expect(
    (await f.api().get('/api/v1/public/storefronts/managed-store').expect(200)).body.items[0]
      .variants[0].totalMinor,
  ).toBe('2000');
  await command({ action: 'settings', settings: { ...config, currency: 'EUR' } });
  item = listingPageSchema.parse((await f.api().get(`${path()}/listings`).set(h)).body).items[0]!;
  expect(item.status).toBe('needs_changes');
  expect(item.issues.map((i) => i.code)).toContain('PRICE_CURRENCY_MISMATCH');
  const second = (
    await f
      .api()
      .post(`${root}/locations`)
      .set(h)
      .send({ kind: 'stores', name: 'Second store', code: 'SECOND', type: 'store' })
      .expect(201)
  ).body.id;
  const secondPath = `${root}/stores/${second}/online-store`;
  await command(
    {
      action: 'settings',
      settings: {
        ...config,
        storeId: second,
        slug: 'second-managed-store',
        enabled: false,
        status: 'configured',
        stockSources: [],
        version: 0,
        fulfillment: {
          ...config.fulfillment,
          pickup: { ...config.fulfillment.pickup, locationId: second },
        },
      },
    },
    secondPath,
  );
  const selection = await command(
    { action: 'select', items: [{ productId: f.variantId, variantId: f.variantId }] },
    secondPath,
  );
  expect(selection.items[0].ok).toBe(true);
  const wrong = await command(
    { action: 'remove', items: [{ id: item.id, version: item.version }] },
    secondPath,
  );
  expect(wrong.items[0].code).toBe('NOT_FOUND');
  expect(
    (await f.api().get(`${secondPath}/listings/${item.id}/history`).set(h).expect(200)).body,
  ).toEqual([]);
  expect((await f.api().get(`${path()}/listings`).set(h).expect(200)).body.items).toHaveLength(1);
  const { tokenHash } = await import('../auth/secrets.js');
  await f
    .db()
    .query(
      "INSERT INTO auth_rate_limits(key_hash,attempts,resets_at) VALUES($1,120,now()+interval '15 minutes') ON CONFLICT(key_hash) DO UPDATE SET attempts=120,resets_at=excluded.resets_at",
      [tokenHash(`storefront:${f.ownerId}:${f.a}:write`)],
    );
  const limited = await f
    .api()
    .post(`${path()}/commands`)
    .set(h)
    .send({ action: 'disable', version: 1, idempotencyKey: randomUUID() })
    .expect(429);
  expect(limited.body.code).toBe('RATE_LIMITED');
});
it('rolls source edits and durable revalidation intents back together', async () => {
  const f = fixture(),
    db = f.db(),
    connection = await db.connect();
  const before = (
    await db.query('SELECT count(*)::int AS n FROM storefront_revalidation WHERE business_id=$1', [
      f.a,
    ])
  ).rows[0].n;
  try {
    await connection.query('BEGIN');
    await connection.query(
      "UPDATE catalog_products SET description='Uncommitted change' WHERE business_id=$1",
      [f.a],
    );
    expect(
      (
        await connection.query(
          'SELECT count(*)::int AS n FROM storefront_revalidation WHERE business_id=$1',
          [f.a],
        )
      ).rows[0].n,
    ).toBeGreaterThan(0);
    await connection.query('ROLLBACK');
  } finally {
    connection.release();
  }
  expect(
    (
      await db.query(
        'SELECT count(*)::int AS n FROM storefront_revalidation WHERE business_id=$1',
        [f.a],
      )
    ).rows[0].n,
  ).toBe(before);
  expect(
    (await db.query('SELECT description FROM catalog_products WHERE business_id=$1', [f.a])).rows[0]
      .description,
  ).not.toBe('Uncommitted change');
});

it('does not leak restricted cost warnings through filters or overview counts', async () => {
  const f = fixture();
  await f
    .db()
    .query(
      "UPDATE business_memberships SET role='custom',permissions=ARRAY['business.read','onlineStore.view'] WHERE business_id=$1 AND account_id=$2",
      [f.a, f.viewerId],
    );
  const warning = [
    {
      code: 'PRICE_BELOW_COST',
      severity: 'warning',
      field: 'price',
      message: 'Review this price.',
      params: {},
    },
  ];
  await f
    .db()
    .query(
      'UPDATE channel_listings SET structured_issues=$1 WHERE business_id=$2 AND store_id=$3',
      [JSON.stringify(warning), f.a, f.storeA],
    );
  const h = native(f.viewerToken);
  const page = await f.api().get(`${path()}/listings`).set(h).expect(200);
  expect(page.body.items[0].issues).toEqual([]);
  expect((await f.api().get(`${path()}/overview`).set(h).expect(200)).body.warnings).toBe(0);
  await f.api().get(`${path()}/listings?issue=PRICE_BELOW_COST`).set(h).expect(403);
  expect(
    (await f.api().get(`${path()}/overview`).set(native(f.ownerToken)).expect(200)).body.warnings,
  ).toBe(1);
});

it('protects image previews with current store access and does not fetch unapproved URLs', async () => {
  const f = fixture();
  const endpoint = `${path()}/image-preview`;
  await f
    .api()
    .post(endpoint)
    .set(native())
    .send({ url: 'https://images.example.com/a' })
    .expect(401);
  await f
    .api()
    .post(endpoint)
    .set(native(f.otherToken))
    .send({ url: 'https://images.example.com/a' })
    .expect(404);
  const invalid = await f
    .api()
    .post(endpoint)
    .set(native(f.managerToken))
    .send({ url: 'http://images.example.com/a' })
    .expect(201);
  expect(invalid.body.status).toBe('not_https');
  const blocked = await f
    .api()
    .post(endpoint)
    .set(native(f.ownerToken))
    .send({ url: 'https://unapproved.example.com/a' })
    .expect(201);
  expect(blocked.body.status).toBe('host_not_allowed');
  expect(blocked.body.dataUrl).toBeUndefined();
  await f
    .db()
    .query(
      "UPDATE business_memberships SET role='cashier',permissions=ARRAY[]::text[] WHERE business_id=$1 AND account_id=$2",
      [f.a, f.viewerId],
    );
  await f
    .api()
    .post(endpoint)
    .set(native(f.viewerToken))
    .send({ url: 'https://images.example.com/a' })
    .expect(403);
});

it('serves bounded store-scoped picker and detail projections without cost fields', async () => {
  const f = fixture(),
    h = native(f.ownerToken);
  const page = await f.api().get(`${path()}/products?limit=1`).set(h).expect(200);
  expect(page.body.items).toHaveLength(1);
  expect(page.body.items[0].source).toHaveProperty('variants');
  expect(JSON.stringify(page.body)).not.toContain('costMinor');
  expect(JSON.stringify(page.body)).not.toContain('supplier');
  const productId = page.body.items[0].productId;
  const sku = (await f.db().query('SELECT sku FROM catalog_products WHERE id=$1', [productId]))
    .rows[0].sku;
  const searched = await f
    .api()
    .get(`${path()}/products?search=${encodeURIComponent(sku)}`)
    .set(h)
    .expect(200);
  expect(searched.body.items.some((p: { productId: string }) => p.productId === productId)).toBe(
    true,
  );
  const listings = await f.api().get(`${path()}/product-list?limit=1`).set(h).expect(200);
  const id = listings.body.page.items[0].id;
  const detail = await f.api().get(`${path()}/listings/${id}`).set(h).expect(200);
  expect(detail.body.preview.productId).toBe(productId);
  expect(detail.body.preview).toHaveProperty('quantity');
  await f.api().get(`${path()}/products`).set(native(f.viewerToken)).expect(403);
  await f.api().get(`${path()}/listings/${id}`).set(native(f.otherToken)).expect(404);
  await f
    .api()
    .get(`${f.root}/${f.a}/stores/${f.storeB}/online-store/listings/${id}`)
    .set(h)
    .expect(404);
  await f.api().get(`${path()}/products?limit=201`).set(h).expect(400);
  await f.api().get(`${path()}/listings/${randomUUID()}`).set(h).expect(404);
  const manager = await f
    .api()
    .get(`${path()}/listings/${id}`)
    .set(native(f.managerToken))
    .expect(200);
  expect(manager.body.listing.id).toBe(id);
  await f
    .api()
    .post(`${path()}/commands`)
    .set(native(f.managerToken))
    .send({
      action: 'overrides',
      id,
      version: manager.body.listing.version,
      overrides: manager.body.listing.overrides,
      idempotencyKey: randomUUID(),
    })
    .expect(403);
});

it('filters attention pages in tenant scope without exposing restricted warnings', async () => {
  const f = fixture();
  await f
    .db()
    .query(
      "UPDATE business_memberships SET role='custom',permissions=ARRAY['business.read','onlineStore.view'] WHERE business_id=$1 AND account_id=$2",
      [f.a, f.viewerId],
    );
  for (const attention of ['sold-out', 'warnings']) {
    const response = await f
      .api()
      .get(`${path()}/listings?attention=${attention}`)
      .set(native(f.viewerToken))
      .expect(200);
    if (attention === 'warnings') expect(response.body.items).toEqual([]);
    for (const item of response.body.items) {
      expect(item.businessId).toBe(f.a);
      if (attention === 'sold-out') {
        expect(item.status).toBe('active');
        expect(item.availability).toBe('SOLD_OUT');
      } else
        expect(
          item.issues.some(
            (issue: { severity: string; code: string }) =>
              issue.severity === 'warning' && issue.code !== 'PRICE_BELOW_COST',
          ),
        ).toBe(true);
    }
    await f
      .api()
      .get(`${path()}/listings?attention=${attention}`)
      .set(native(f.otherToken))
      .expect(404);
  }
  await f.api().get(`${path()}/listings?attention=invalid`).set(native(f.ownerToken)).expect(400);
});
it('bounds product-channel lookups and filters picker readiness without weakening access', async () => {
  const f = fixture(),
    h = native(f.ownerToken);
  const listed = await f
    .api()
    .get(`${path()}/listings?productIds=${f.variantId}`)
    .set(h)
    .expect(200);
  expect(listed.body.items.every((l: { productId: string }) => l.productId === f.variantId)).toBe(
    true,
  );
  await f.api().get(`${path()}/listings?productIds=invalid`).set(h).expect(400);
  expect(
    (await f.api().get(`${path()}/listings?productIds=${crypto.randomUUID()}`).set(h).expect(200))
      .body.items,
  ).toEqual([]);
  for (const readiness of ['ready', 'issues', 'inactive']) {
    const result = await f
      .api()
      .get(`${path()}/products?readiness=${readiness}&inStock=true`)
      .set(h)
      .expect(200);
    for (const p of result.body.items) {
      expect(Number(p.quantity)).toBeGreaterThan(0);
      if (readiness === 'ready')
        expect(p.issues.some((i: { severity: string }) => i.severity === 'error')).toBe(false);
    }
  }
  await f.api().get(`${path()}/products`).set(native(f.viewerToken)).expect(403);
  await f
    .api()
    .get(`${path()}/listings?productIds=${f.variantId}`)
    .set(native(f.otherToken))
    .expect(404);
});
