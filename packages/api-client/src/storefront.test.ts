import { expect, it, vi } from 'vitest';
import { createStorefrontClient, listingForm } from './storefront.js';
import { listingSchema } from '@inventory/contracts';
import { workspaceRoutes, routeAllowed } from './workspace-navigation.js';
const id = '00000000-0000-4000-8000-000000000001';
it('validates mutation inputs and uses a single versioned attempt', async () => {
  const request = vi.fn().mockRejectedValue(new Error('offline'));
  const client = createStorefrontClient(request, id);
  await expect(client.command(id, 2, 'publish')).rejects.toThrow('offline');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(`/${id}/storefront/listings/${id}`, 'POST', {
    version: 2,
    action: 'publish',
  });
});
it('listing form submits only editable overrides, never server state or private pricing', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true });
  const client = createStorefrontClient(request, id);
  const listing = listingSchema.parse({
    id,
    productId: id,
    version: 4,
    state: 'ready',
    issues: [],
    ruleVersion: 1,
    projection: null,
  });
  await listingForm(client, listing).submit({
    title: 'Public name',
    description: 'Public description',
    images: 'https://media.example.test/a.png',
    weightGrams: '',
  });
  expect(request.mock.calls[0]?.[2]).toEqual({
    productId: id,
    version: 4,
    title: 'Public name',
    description: 'Public description',
    images: ['https://media.example.test/a.png'],
    weightGrams: null,
  });
});
it('does not display the publication route without dedicated permission', () => {
  const route = workspaceRoutes.find((r) => r.path === '/storefront')!;
  expect(routeAllowed(route)).toBe(false);
});

it('prefills editable setup from business defaults without overwriting saved online details', async () => {
  const { storefrontWorkspaceSchema } = await import('@inventory/contracts');
  const { storefrontForms } = await import('./storefront.js');
  const client = createStorefrontClient(vi.fn(), id);
  const data = storefrontWorkspaceSchema.parse({
    settings: null,
    defaults: {
      name: 'Business name',
      slug: 'business-name',
      storeId: id,
      currency: 'PKR',
      contact: 'Office address',
    },
    prerequisites: [],
    listings: [],
    trustedMediaOrigins: [],
  });
  const fields = storefrontForms(client, data, [])[0]!.fields;
  expect(fields.find((f) => f.name === 'name')?.value).toBe('Business name');
  expect(fields.find((f) => f.name === 'currency')?.value).toBe('PKR');
  expect(fields.find((f) => f.name === 'storeId')?.value).toBe(id);
  expect(fields.find((f) => f.name === 'contact')?.value).toBe('Office address');
  data.settings = {
    ...data.defaults,
    name: 'My online brand',
    slug: 'online-brand',
    storeId: id,
    currency: 'USD',
    contact: 'Online contact',
    fulfillment: 'pickup',
    returnPolicy: 'Return policy text',
    shippingPolicy: '',
    enabled: false,
    hideSoldOut: false,
    version: 2,
  };
  expect(storefrontForms(client, data, [])[0]!.fields.find((f) => f.name === 'name')?.value).toBe(
    'My online brand',
  );
  expect(
    storefrontForms(client, data, [])[0]!.fields.find((f) => f.name === 'currency')?.value,
  ).toBe('USD');
});
