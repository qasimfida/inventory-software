import { expect, it } from 'vitest';
import { productSchema } from '@inventory/contracts';
import { catalogCsv } from './catalog-export.js';
it('exports only supplied records, exact prices, quotes and safe spreadsheet text', () => {
  const product = productSchema.parse({
    id: '00000000-0000-4000-8000-000000000001',
    name: '=HYPERLINK("example")',
    sku: 'SKU',
    version: 1,
    createdAt: '2026-10-01T00:00:00Z',
  });
  const csv = catalogCsv([product]);
  expect(csv).toContain('"\'=HYPERLINK(""example"")"');
  expect(csv.split('\r\n')).toHaveLength(2);
  expect(csv).toContain('"Price","Currency","Unit"');
  expect(catalogCsv([]).split('\r\n')).toHaveLength(1);
});
