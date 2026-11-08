import { expect, it, vi } from 'vitest';
import { pricingWorkspaceSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { createInventoryClient } from './inventory.js';
import { immediatePriceForm, productQuantityForm } from './product-setup-forms.js';
const seed = createDemoSeed(0, 'owner');
const data = pricingWorkspaceSchema.parse({
  units: seed.units,
  variants: seed.variants,
  conversions: [],
  prices: seed.prices,
  promotions: [],
});
const warehouse = seed.locations.find((l) => l.kind === 'warehouses')!;
const input = {
  warehouseId: warehouse.id,
  variantId: data.variants[0]!.id,
  quantity: '2.5',
  reason: 'Opening balance',
};
it('posts quantities in the selected base unit and preserves retry identity after network failure', async () => {
  const request = vi.fn().mockRejectedValue(new Error('lost response'));
  const newKey = vi.fn(() => '00000000-0000-4000-8000-000000000099');
  const client = createInventoryClient(request, newKey, seed.business.id);
  const form = productQuantityForm(client, data, seed.locations, true);
  await expect(form.submit(input)).rejects.toThrow('lost response');
  await expect(form.submit(input)).rejects.toThrow('lost response');
  expect(newKey).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[2]).toMatchObject({
    quantity: '2.5',
    unitId: data.variants[0]!.baseUnitId,
    locationId: null,
    reasonCode: 'opening_balance',
    type: 'opening',
  });
  expect(request.mock.calls[0]?.[2]).toEqual(request.mock.calls[1]?.[2]);
});
it('rejects invalid quantity, warehouse, variant and direction before posting', async () => {
  const request = vi.fn();
  const form = productQuantityForm(
    createInventoryClient(request, () => crypto.randomUUID(), seed.business.id),
    data,
    seed.locations,
    false,
  );
  for (const patch of [
    { quantity: '-1' },
    { quantity: '0' },
    { warehouseId: seed.business.id },
    { variantId: seed.business.id },
    { direction: 'sale' },
  ]) {
    expect(() => form.submit({ ...input, direction: 'adjustment_in', ...patch })).toThrow();
  }
  expect(request).not.toHaveBeenCalled();
});
it('keeps one immediate price command with an explicit variant and server-compatible effective time', async () => {
  const submit = vi.fn().mockResolvedValue({});
  const form = immediatePriceForm(
    {
      title: 'Publish price',
      fields: [
        { name: 'unitPrice', label: 'Selling price' },
        { name: 'startsAt', label: 'Starts' },
        { name: 'variantId', label: 'Variant' },
      ],
      submit,
    },
    'variant',
  );
  expect(form.fields.map((f) => f.name)).toEqual(['unitPrice']);
  await form.submit({ unitPrice: '12.50', currency: 'USD' });
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ variantId: 'variant', unitPrice: '12.50', endsAt: '' }),
  );
  expect(Number.isFinite(Date.parse(submit.mock.calls[0]?.[0].startsAt))).toBe(true);
});
it('reports invalid tax percentages as validation before sending a selling price', async () => {
  const { createPricingClient } = await import('./pricing.js');
  const { priceForms } = await import('./price-forms.js');
  const request = vi.fn();
  const variant = data.variants[0]!.id;
  const client = createPricingClient(request, seed.business.id, variant);
  const form = immediatePriceForm(
    priceForms(client, data, seed.business, seed.locations, variant).find(
      (f) => f.title === 'Publish price',
    )!,
    variant,
  );
  for (const tax of ['no tax', '-1', '101', '1.234']) {
    expect(() =>
      form.submit({
        unitPrice: '15',
        currency: 'USD',
        storeId: '',
        taxInclusive: false,
        taxBasisPoints: tax,
      }),
    ).toThrow(expect.objectContaining({ name: 'ZodError' }));
  }
  expect(request).not.toHaveBeenCalled();
});

it('allows blank tax, preserves business defaults and distinguishes explicit zero', async () => {
  const { createPricingClient } = await import('./pricing.js');
  const { priceForms } = await import('./price-forms.js');
  const { companyProfileSchema } = await import('@inventory/contracts');
  const request = vi.fn().mockResolvedValue(data.prices[0]);
  const variant = data.variants[0]!.id;
  const form = immediatePriceForm(
    priceForms(
      createPricingClient(request, seed.business.id, variant),
      data,
      seed.business,
      seed.locations,
      variant,
      companyProfileSchema.parse({ taxBasisPoints: 1500 }),
    ).find((f) => f.title === 'Publish price')!,
    variant,
  );
  expect(form.fields.find((f) => f.name === 'taxBasisPoints')?.required).toBe(false);
  for (const [value, expected] of [
    ['', 1500],
    ['0', 0],
  ] as const) {
    await form.submit({
      unitPrice: '15',
      currency: 'USD',
      storeId: '',
      taxInclusive: false,
      taxBasisPoints: value,
    });
    expect(request.mock.calls.at(-1)?.[2]).toMatchObject({ taxBasisPoints: expected });
  }
});
