import { expect, it } from 'vitest';
import { storefrontReadiness, listingInputSchema } from './storefront.js';
import { hasPermission } from './permissions.js';
const input = {
  title: 'Public item',
  description: 'A complete public description.',
  images: ['https://media.example.test/item.png'],
  category: true,
  active: true,
  variantsValid: true,
  delivery: false,
  weightGrams: null,
};
it('adapts legacy content checks to the shared versioned readiness engine', () => {
  expect(storefrontReadiness(input, ['https://media.example.test'])).toEqual([]);
  for (const image of [
    'https://evil.test/image',
    'https://media.example.test.evil.test/image',
    'https://media.example.test@evil.test/image',
  ])
    expect(
      storefrontReadiness({ ...input, images: [image] }, ['https://media.example.test']),
    ).toContain(
      image.includes('@')
        ? 'Use a valid HTTPS image URL without credentials.'
        : 'Choose an image from an allowed source, or ask an administrator to approve its host.',
    );
  expect(storefrontReadiness({ ...input, delivery: true }, ['https://media.example.test'])).toEqual(
    [],
  );
  expect(
    storefrontReadiness({ ...input, variantsValid: false }, ['https://media.example.test']),
  ).not.toEqual([]);
  expect(storefrontReadiness(input, [])).not.toEqual([]);
});
it('does not permit customer-price or publication-state fields in listing edits', () => {
  expect(
    listingInputSchema.safeParse({
      productId: '00000000-0000-4000-8000-000000000001',
      version: 0,
      price: 10,
      state: 'active',
    }).success,
  ).toBe(false);
});
it('requires dedicated permission; ordinary manager and cashier do not inherit online-store authority', () => {
  for (const role of ['manager', 'cashier', 'viewer'] as const)
    expect(hasPermission({ role, permissions: [] }, 'onlineStore.manage')).toBe(false);
  expect(hasPermission({ role: 'owner', permissions: [] }, 'onlineStore.manage')).toBe(true);
  expect(
    hasPermission({ role: 'custom', permissions: ['onlineStore.manage'] }, 'onlineStore.manage'),
  ).toBe(true);
});
