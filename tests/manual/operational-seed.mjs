// Local isolated QA API only. Commands create traceable fixtures through the real domain APIs.
import { writeFile } from 'node:fs/promises';
import {
  developmentPassword,
  developmentIds as ids,
} from '../../apps/api/dist/development/fixtures.js';
const base = 'http://127.0.0.1:3191/api/v1';
const login = await fetch(base + '/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-inventory-client': 'native' },
  body: JSON.stringify({ email: 'admin@inv.com', password: developmentPassword }),
});
if (!login.ok) throw new Error(`Fixture login failed: ${login.status}`);
const session = await login.json();
async function request(path, body) {
  const r = await fetch(base + `/businesses/${ids.business}` + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      'x-inventory-client': 'native',
      authorization: `Bearer ${session.token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok)
    throw new Error(`Fixture command ${path} failed (${r.status}); inspect state before retrying.`);
  return r.json();
}
const products = await request('/products?search=AUDIT-NOTEBOOK');
let product = products.items.find((p) => p.sku === 'AUDIT-NOTEBOOK');
if (!product)
  product = await request('/products', {
    name: 'Audit notebook',
    sku: 'AUDIT-NOTEBOOK',
    description: 'Isolated local UI regression fixture',
  });
const pricing = await request(`/products/${product.id}/pricing`),
  variant = pricing.variants[0];
if (!pricing.prices.length)
  await request('/prices', {
    variantId: variant.id,
    storeId: null,
    customerId: null,
    unitPrice: '12.50',
    currency: 'USD',
    taxBasisPoints: 1000,
    taxInclusive: false,
    startsAt: new Date(Date.now() - 60000).toISOString(),
    endsAt: null,
  });
await request('/stock/movements', {
  warehouseId: ids.warehouse,
  variantId: variant.id,
  unitId: variant.baseUnitId,
  quantity: '20',
  type: 'opening',
  reason: 'Isolated local UI checkout fixture',
  idempotencyKey: '9bd97427-ad3b-4ace-a899-27e65f77f5f4',
});
await writeFile(
  'docs/qa/operational-ui/seed.json',
  JSON.stringify(
    {
      productId: product.id,
      variantId: variant.id,
      sku: product.sku,
      warehouseId: ids.warehouse,
      price: 'USD 12.50',
      taxBasisPoints: 1000,
      openingQuantity: '20',
      idempotencyKey: '9bd97427-ad3b-4ace-a899-27e65f77f5f4',
      api: '127.0.0.1:3191',
      retained: true,
    },
    null,
    2,
  ),
);
console.log('Isolated checkout fixture ready; opening stock uses an idempotent ledger command.');
