import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const directory = mkdtempSync(join(tmpdir(), 'inventory-media-test-'));
beforeAll(() => {
  vi.stubEnv('PRODUCT_MEDIA_DIRECTORY', directory);
  vi.stubEnv('PRODUCT_MEDIA_PUBLIC_BASE_URL', 'https://media.example.test/api/v1/product-media');
});
const fixture = organizationFixture();
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
it('authorizes tenant uploads, serves raster assets only and records an audit without image content', async () => {
  const { api, root, a, ownerToken, otherToken, viewerToken, db } = fixture();
  const path = `${root}/${a}/product-images`;
  await api().post(path).set(native()).send({ mime: 'image/png', base64: png }).expect(401);
  await api()
    .post(path)
    .set(native(viewerToken))
    .send({ mime: 'image/png', base64: png })
    .expect(403);
  await api()
    .post(path)
    .set(native(otherToken))
    .send({ mime: 'image/png', base64: png })
    .expect(404);
  const response = await api()
    .post(path)
    .set(native(ownerToken))
    .send({ mime: 'image/png', base64: png })
    .expect(201);
  const url = new URL(response.body.url as string);
  expect(url.origin).toBe('https://media.example.test');
  const image = await api().get(url.pathname).expect(200);
  expect(image.headers['content-type']).toContain('image/png');
  expect(image.headers['x-content-type-options']).toBe('nosniff');
  expect(image.body).toEqual(Buffer.from(png, 'base64'));
  const events = await db().query(
    "SELECT after_data FROM organization_audit WHERE business_id=$1 AND action='product.image_uploaded'",
    [a],
  );
  expect(events.rowCount).toBe(1);
  expect(JSON.stringify(events.rows)).not.toContain(png);
  await api().get(`/api/v1/product-media/${a}/not-a-file`).expect(404);
});
it('rejects active content, mismatched MIME and oversized uploads without saving files', async () => {
  const { api, root, a, ownerToken } = fixture();
  const before = await readdir(join(directory, a)).catch(() => []);
  for (const input of [
    { mime: 'image/png', base64: Buffer.from('<svg onload="alert(1)"></svg>').toString('base64') },
    { mime: 'image/webp', base64: png },
    { mime: 'image/png', base64: Buffer.alloc(512 * 1024 + 1).toString('base64') },
  ])
    await api().post(`${root}/${a}/product-images`).set(native(ownerToken)).send(input).expect(400);
  expect(await readdir(join(directory, a)).catch(() => [])).toEqual(before);
});
