import { expect, it, vi } from 'vitest';
import { pricingWorkspaceSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { createPricingClient } from './pricing.js';
import { variantForms } from './variant-forms.js';
import { quoteForm } from './price-forms.js';
import { variantUnitSummary, promotionState } from './pricing-presentation.js';
const seed = createDemoSeed(0, 'owner');
const kg = {
  id: '00000000-0000-4000-8000-000000000091',
  name: 'Kilogram',
  code: 'KG',
  dimension: 'mass' as const,
};
const pack = {
  ...kg,
  id: '00000000-0000-4000-8000-000000000092',
  name: 'Half kilogram',
  code: 'HALF',
};
const liter = {
  ...kg,
  id: '00000000-0000-4000-8000-000000000093',
  name: 'Liter',
  code: 'L',
  dimension: 'volume' as const,
};
const data = pricingWorkspaceSchema.parse({
  units: [kg, pack, liter],
  variants: [
    {
      ...seed.variants[0],
      baseUnitId: kg.id,
      saleUnitId: null,
      purchaseUnitId: null,
      countUnitId: null,
    },
  ],
  conversions: [],
  prices: [],
  promotions: [],
});
const id = data.variants[0]!.id;
const client = createPricingClient(vi.fn(), seed.business.id, id);
it('offers only compatible new conversions and immutable base units on edit', () => {
  const forms = variantForms(client, data, id, true);
  expect(forms[2]!.fields.find((f) => f.name === 'unitId')!.options?.map((o) => o.value)).toEqual([
    pack.id,
  ]);
  expect(
    forms[1]!.fields.find((f) => f.name === 'baseUnitId')!.options?.map((o) => o.value),
  ).toEqual([kg.id]);
  expect(forms[1]!.fields.find((f) => f.name === 'saleUnitId')!.value).toBe('');
  expect(
    forms[1]!.fields.find((f) => f.name === 'saleUnitId')!.options?.map((o) => o.value),
  ).toEqual(['', kg.id]);
});
it('filters new variant base choices by measurement without mixing volume and mass', () => {
  const form = variantForms(client, data, id, false, 'volume')[1]!;
  expect(form.fields.find((f) => f.name === 'baseUnitId')!.options?.map((o) => o.value)).toEqual([
    liter.id,
  ]);
});
it('makes only configured conversions available for default units and quotes', () => {
  const configured = {
    ...data,
    conversions: [{ variantId: id, unitId: pack.id, numerator: '0.5', denominator: '1' }],
  };
  expect(
    quoteForm(client, configured, [], id, vi.fn())
      .fields.find((f) => f.name === 'unitId')!
      .options?.map((o) => o.value),
  ).toEqual([kg.id, pack.id]);
  expect(variantUnitSummary(configured, id)).toContain('1 Half kilogram = 0.5 / 1 Kilogram.');
});
it('rejects invalid ratios before a mutation', () => {
  const conversion = vi.fn();
  const form = variantForms({ ...client, conversion }, data, id)[2]!;
  for (const numerator of ['0', '-1', '1e3', '0.0000001'])
    expect(() =>
      form.submit({ variantId: id, unitId: pack.id, numerator, denominator: '1' }),
    ).toThrow();
  expect(() =>
    form.submit({ variantId: id, unitId: pack.id, numerator: '1', denominator: '0' }),
  ).toThrow();
  expect(conversion).not.toHaveBeenCalled();
});
it('classifies existing promotion states without inventing a draft state', () => {
  const p = {
    id,
    variantId: id,
    name: 'Half price',
    storeId: null,
    discountBasisPoints: 5000,
    minimumQuantity: '1',
    priority: 0,
    withdrawn: false,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2026-02-01T00:00:00Z',
  };
  expect(promotionState(p, Date.parse('2025-12-01'))).toBe('Scheduled');
  expect(promotionState(p, Date.parse('2026-01-05'))).toBe('Active');
  expect(promotionState(p, Date.parse('2026-02-01'))).toBe('Expired');
  expect(promotionState({ ...p, withdrawn: true }, Date.parse('2026-01-05'))).toBe('Withdrawn');
});
it('preserves inherited unit defaults, default identifiers and unrelated attributes on edit', async () => {
  const editVariant = vi.fn().mockResolvedValue({});
  const existing = {
    ...data,
    variants: [
      { ...data.variants[0]!, isDefault: true, attributes: { material: 'cotton', size: 'M' } },
    ],
  };
  const form = variantForms({ ...client, editVariant }, existing, id, true)[1]!;
  expect(form.fields.some((f) => f.name === 'sku' || f.name === 'barcodes')).toBe(false);
  const values = Object.fromEntries(form.fields.map((f) => [f.name, f.value ?? '']));
  await form.submit({
    ...values,
    name: 'Updated',
    size: 'L',
    saleUnitId: '',
    purchaseUnitId: '',
    countUnitId: '',
  });
  expect(editVariant).toHaveBeenCalledWith(
    id,
    expect.objectContaining({
      sku: existing.variants[0]!.sku,
      barcodes: existing.variants[0]!.barcodes,
      purchaseUnitId: null,
      saleUnitId: null,
      countUnitId: null,
      attributes: { material: 'cotton', size: 'L' },
    }),
  );
});
