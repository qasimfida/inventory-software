import { expect, it, vi } from 'vitest';
import { companyProfileSchema, pricingWorkspaceSchema } from '@inventory/contracts';
import { createSetupClient, setupSteps } from './setup-checklist.js';
import { priceForms } from './price-forms.js';
import { createPricingClient } from './pricing.js';
import { createDemoSeed } from './mock/seed.js';
it('validates setup responses and uses the explicit business scope and cancellation signal', async () => {
  const response = {
    dismissed: false,
    profile: false,
    currency: false,
    tax: true,
    locations: true,
    product: false,
    stock: false,
  };
  const request = vi.fn().mockResolvedValue(response),
    signal = new AbortController().signal;
  expect(await createSetupClient(request, 'business')(signal)).toEqual(response);
  expect(request).toHaveBeenCalledWith('/business/setup', 'GET', undefined, signal);
  request.mockResolvedValue({ ...response, stock: 'true' });
  await expect(createSetupClient(request, 'business')()).rejects.toThrow();
  expect(new Set(setupSteps.map((step) => step.key)).size).toBe(6);
});

it('new price forms initialize business defaults without changing explicit submission semantics', async () => {
  const seed = createDemoSeed(0, 'owner');
  const data = pricingWorkspaceSchema.parse({
    units: seed.units,
    variants: seed.variants,
    conversions: [],
    prices: seed.prices,
    promotions: [],
  });
  const request = vi.fn().mockImplementation(async (path, method, input) => {
    expect(path).toContain('/prices');
    expect(method).toBe('POST');
    return { ...input, id: seed.prices[0]!.id };
  });
  const client = createPricingClient(request, seed.business.id, seed.products[0]!.id);
  const forms = priceForms(
    client,
    data,
    seed.business,
    seed.locations,
    seed.variants[0]!.id,
    companyProfileSchema.parse({
      transactionCurrency: 'PKR',
      taxBasisPoints: 1750,
      taxInclusive: true,
    }),
  );
  const price = forms.find((form) => form.title === 'Publish price')!;
  expect(price.fields.find((field) => field.name === 'currency')?.value).toBe('PKR');
  expect(price.fields.find((field) => field.name === 'taxBasisPoints')?.value).toBe('');
  expect(price.fields.find((field) => field.name === 'taxInclusive')?.value).toBe(true);
  const input = {
    variantId: seed.variants[0]!.id,
    storeId: '',
    unitPrice: '3',
    currency: 'PKR',
    taxBasisPoints: '',
    taxInclusive: true,
    startsAt: '2026-11-08T00:00:00.000Z',
    endsAt: '',
  };
  await price.submit(input);
  expect(request.mock.calls.at(-1)?.[2]).toMatchObject({ taxBasisPoints: 1750, currency: 'PKR' });
  await price.submit({ ...input, taxBasisPoints: '0' });
  expect(request.mock.calls.at(-1)?.[2]).toMatchObject({ taxBasisPoints: 0 });
});
