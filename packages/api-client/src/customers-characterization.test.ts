import { expect, it, vi } from 'vitest';
import { customerSchema, customerStatementSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { readCommerce } from './mock/read-commerce.js';
import { createCustomerClient } from './customers.js';
import { createPricingClient } from './pricing.js';
import { customerDetailForms, customerProfileForm } from './customer-forms.js';
const seed = createDemoSeed(0, 'owner');
const customer = customerSchema.parse(seed.customers[0]);
const statement = customerStatementSchema.parse(
  readCommerce(seed, `customers/${customer.id}/statement`, new URLSearchParams(), false),
);
const request = vi.fn();
const client = createCustomerClient(request, () => 'payment-key', seed.business.id);
const pricing = createPricingClient(request, seed.business.id, '');
it('keeps viewer details read-only', () => {
  expect(
    customerDetailForms(client, pricing, customer, { ...seed.business, role: 'viewer' }, statement),
  ).toEqual([]);
});
it('offers cash collection only for outstanding receivables', () => {
  const forms = customerDetailForms(client, pricing, customer, seed.business, {
    ...statement,
    receivables: [],
  });
  expect(forms.map((f) => f.title)).not.toContain('Record customer cash payment');
});
it('does not offer profile editing for an anonymized customer', () => {
  expect(
    customerDetailForms(
      client,
      pricing,
      { ...customer, anonymized: true },
      seed.business,
      statement,
    ).map((f) => f.title),
  ).not.toContain(`Save customer ${customer.code}`);
});
it('preserves version, store and immutable currency in the profile command', async () => {
  const form = customerProfileForm(client, customer.storeId, customer);
  expect(form.fields.find((f) => f.name === 'currency')?.options).toEqual([
    { value: customer.currency, label: customer.currency },
  ]);
  await form.submit(Object.fromEntries(form.fields.map((f) => [f.name, f.value ?? ''])));
  expect(request).toHaveBeenLastCalledWith(
    `/${seed.business.id}/customers/${customer.id}`,
    'PATCH',
    expect.objectContaining({
      version: customer.version,
      storeId: customer.storeId,
      currency: customer.currency,
    }),
  );
});
it('keeps uncertain cash payments single-attempt and preserves the retry identity', async () => {
  const transport = vi.fn().mockRejectedValue(new Error('uncertain'));
  const key = vi.fn(() => 'payment-key');
  const c = createCustomerClient(transport, key, seed.business.id);
  const input = { receivableId: seed.id(900), amountMinor: '12345', reference: 'Till receipt' };
  await expect(c.pay(customer.id, input)).rejects.toThrow('uncertain');
  expect(transport).toHaveBeenCalledTimes(1);
  await expect(c.pay(customer.id, input)).rejects.toThrow('uncertain');
  expect(transport.mock.calls[1]).toEqual(transport.mock.calls[0]);
  expect(key).toHaveBeenCalledTimes(1);
});
