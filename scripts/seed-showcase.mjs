/** Additive local development fixtures. Stock is posted through LedgerCore-backed APIs. */
import { createHash } from 'node:crypto';
import {
  assertDevelopmentDatabase,
  developmentPassword,
  developmentIds,
} from '../apps/api/dist/development/fixtures.js';
try {
  process.loadEnvFile('apps/api/.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
assertDevelopmentDatabase(process.env);
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3100');
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) ||
  origin.protocol !== 'http:' ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash
)
  throw new Error('Use a loopback development API origin.');
const base = `${origin.origin}/api/v1`;
let token;
let writes = 0;
const totals = {
  businesses: 0,
  locations: 0,
  products: 0,
  prices: 0,
  stockCommands: 0,
  warehousesReconciled: 0,
};
async function request(path, body) {
  if (body && !path.startsWith('/auth/')) writes++;
  const result = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      'x-inventory-client': 'native',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!result.ok)
    throw new Error(
      `Development fixture command ${path} failed (${result.status}). No mutation was retried; inspect the server before resuming.`,
    );
  return result.status === 204 ? null : result.json();
}
const key = (value) => {
  const hex = createHash('sha256').update(`showcase-v1:${value}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
token = (
  await request('/auth/login', { email: 'superadmin@inv.com', password: developmentPassword })
).token;
if (!token) throw new Error('Native development session unavailable.');
const names = ['Demo Harbor Home', 'Demo City Office', 'Demo Trail Supply'];
const businesses = (await request('/businesses')).businesses;
const selected = businesses.filter((b) => b.id === developmentIds.business);
for (const name of names) {
  let business = businesses.find((b) => b.name === name);
  if (!business) {
    business = await request('/businesses', { name });
    totals.businesses++;
  }
  selected.push(business);
}
const products = [
  ['MUG', 'Stoneware mug', '12.50'],
  ['NOTE', 'Pocket notebook', '5.75'],
  ['BOTTLE', 'Travel bottle', '24.00'],
  ['BAG', 'Canvas market bag', '18.50'],
  ['LAMP', 'Desk reading lamp', '39.00'],
  ['TRAY', 'Storage tray', '16.25'],
  ['PEN', 'Refillable pen', '8.50'],
  ['TOWEL', 'Cotton hand towel', '9.00'],
  ['BOX', 'Stackable storage box', '22.00'],
  ['CUSHION', 'Woven cushion', '28.00'],
  ['CLOCK', 'Desk clock', '31.50'],
  ['MAT', 'Desk mat', '19.75'],
];
for (const business of selected) {
  // Keep each business setup within the normal session write budget; never retry mutations.
  if (writes > 60) {
    token = (
      await request('/auth/login', {
        email: 'superadmin@inv.com',
        password: developmentPassword,
      })
    ).token;
    writes = 0;
  }
  const path = `/businesses/${business.id}`;
  let workspace = await request(path);
  if (!workspace.members.some((member) => member.email === 'admin@inv.com'))
    await request(`${path}/members`, {
      email: 'admin@inv.com',
      role: 'owner',
      permissions: [],
      scope: { storeId: null, warehouseId: null },
    });
  const locations = [...workspace.locations];
  for (const [code, name] of [
    ['SHOW-DOWNTOWN', 'Downtown store'],
    ['SHOW-RIVERSIDE', 'Riverside branch'],
  ]) {
    let store = locations.find((l) => l.kind === 'stores' && l.code === code);
    if (!store) {
      store = await request(`${path}/locations`, {
        kind: 'stores',
        name,
        code,
        type: code.endsWith('DOWNTOWN') ? 'store' : 'branch',
      });
      locations.push(store);
      totals.locations++;
    }
    for (const suffix of ['FLOOR', 'BACK']) {
      const warehouseCode = `${code}-${suffix}`;
      if (!locations.some((l) => l.kind === 'warehouses' && l.code === warehouseCode)) {
        locations.push(
          await request(`${path}/locations`, {
            kind: 'warehouses',
            name: `${name} · ${suffix === 'FLOOR' ? 'Sales floor' : 'Back room'}`,
            code: warehouseCode,
            storeId: store.id,
          }),
        );
        totals.locations++;
      }
    }
  }
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  for (const [index, [code, name, price]] of products.entries()) {
    const sku = `SHOW-${code}`;
    const page = await request(`${path}/products?search=${sku}`);
    let product = page.items.find((p) => p.sku === sku);
    if (!product) {
      product = await request(`${path}/products`, {
        sku,
        name,
        description: 'Development showcase item for catalog, checkout and warehouse testing.',
      });
      totals.products++;
    }
    const pricing = await request(`${path}/products/${product.id}/pricing`);
    const variant = pricing.variants.find((v) => v.sku === sku) ?? pricing.variants[0];
    if (!variant) throw new Error(`No sellable variant for ${sku}`);
    if (!pricing.prices.length) {
      await request(`${path}/prices`, {
        variantId: variant.id,
        storeId: null,
        customerId: null,
        unitPrice: price,
        currency: 'USD',
        taxBasisPoints: 0,
        taxInclusive: false,
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: null,
      });
      totals.prices++;
    }
    for (const warehouse of warehouses) {
      const quantity = index % 6 === 0 ? 0 : index % 4 === 0 ? 2 : 12 + index;
      if (!quantity) continue;
      const stock = await request(
        `${path}/stock?warehouseId=${warehouse.id}&search=${sku}&limit=100`,
      );
      if (stock.balances.some((balance) => balance.variantId === variant.id)) continue;
      await request(`${path}/stock/movements`, {
        warehouseId: warehouse.id,
        variantId: variant.id,
        unitId: variant.baseUnitId,
        quantity: String(quantity),
        type: 'opening',
        reason: 'Development showcase opening stock',
        idempotencyKey: key(`${business.id}:${warehouse.id}:${variant.id}`),
      });
      totals.stockCommands++;
    }
  }
  for (const warehouse of warehouses) {
    const reconciliation = await request(`${path}/warehouses/${warehouse.id}/reconciliation`);
    if (!reconciliation.consistent)
      throw new Error('Warehouse ledger reconciliation failed. Inspect before changing stock.');
    totals.warehousesReconciled++;
  }
}
console.log(
  JSON.stringify(
    {
      api: origin.origin,
      businessesPrepared: selected.length,
      ...totals,
      note: 'Stock commands reuse stable IDs; reruns preserve existing records and cannot duplicate opening movements.',
    },
    null,
    2,
  ),
);
