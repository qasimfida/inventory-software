import { describe, it, expect } from 'vitest';
import { evaluateStorefrontReadiness, validImageHost } from './storefront-readiness.js';
import type { ReadinessInput } from './storefront-readiness.js';
import { listingTransition, revalidatedListingStatus } from './storefront-transitions.js';
const base: ReadinessInput = {
  exists: true,
  state: 'active',
  title: 'Coffee mug',
  description: 'A durable ceramic coffee mug for everyday use.',
  images: ['https://media.example.com/a.png', 'https://media.example.com/b.png'],
  allowedHosts: ['media.example.com'],
  category: true,
  currency: 'USD',
  variants: [
    { id: 'one', sku: 'MUG', unit: 'EACH', complete: true, priceMinor: '100', currency: 'USD' },
  ],
  hasStockSource: true,
  soldOut: false,
  lowStock: false,
};
describe('structured readiness', () => {
  const cases: Array<[string, Partial<ReadinessInput>]> = [
    ['TITLE_MISSING', { title: '' }],
    ['TITLE_TOO_SHORT', { title: 'a' }],
    ['DESCRIPTION_MISSING', { description: '' }],
    ['DESCRIPTION_TOO_SHORT', { description: 'short' }],
    ['NO_IMAGE', { images: [] }],
    ['IMAGE_URL_INVALID', { images: ['http://media.example.com/x'] }],
    ['IMAGE_HOST_NOT_ALLOWED', { images: ['https://evil.example.com/x'] }],
    ['CATEGORY_MISSING', { category: false }],
    ['NO_STOCK_SOURCE', { hasStockSource: false }],
    ['PRODUCT_NOT_FOUND', { exists: false }],
    ['PRODUCT_INACTIVE', { state: 'inactive' }],
    ['PRODUCT_ARCHIVED', { state: 'archived' }],
    ['SINGLE_IMAGE', { images: [base.images[0]!] }],
    ['LOW_STOCK', { lowStock: true }],
  ];
  for (const [code, patch] of cases)
    it(code, () =>
      expect(
        evaluateStorefrontReadiness({ ...base, ...patch }).issues.some(
          (i) => i.code === code && i.field && i.message,
        ),
      ).toBe(true),
    );
  const variants: Array<[string, Partial<ReadinessInput['variants'][number]>]> = [
    ['PRICE_MISSING', { priceMinor: null }],
    ['PRICE_NOT_POSITIVE', { priceMinor: '0' }],
    ['PRICE_CURRENCY_MISMATCH', { currency: 'EUR' }],
    ['SKU_MISSING', { sku: '' }],
    ['UNIT_MISSING', { unit: '' }],
    ['VARIANT_INCOMPLETE', { complete: false }],
    ['PRICE_BELOW_COST', { costMinor: '200' }],
    ['OVERRIDE_DIFFERS_FROM_POS_PRICE', { posPriceMinor: '200' }],
  ];
  for (const [code, patch] of variants)
    it(code, () =>
      expect(
        evaluateStorefrontReadiness({
          ...base,
          variants: [{ ...base.variants[0]!, ...patch }],
        }).issues.map((i) => i.code),
      ).toContain(code),
    );
  it('warnings and sold out do not block readiness', () => {
    const result = evaluateStorefrontReadiness({
      ...base,
      soldOut: true,
      lowStock: true,
      images: [base.images[0]!],
    });
    expect(result.ready).toBe(true);
    expect(result.availability).toBe('SOLD_OUT');
    expect(result.issues.map((i) => i.code)).toEqual(['SINGLE_IMAGE']);
  });
  it('rejects credential, port and host-prefix image tricks', () => {
    for (const url of [
      'https://media.example.com@evil.example/x',
      'https://media.example.com:444/x',
      'https://media.example.com.evil.example/x',
    ])
      expect(evaluateStorefrontReadiness({ ...base, images: [url] }).ready).toBe(false);
  });
  it('validates exact public hosts', () => {
    expect(validImageHost('images.example.com')).toBe(true);
    for (const h of [
      'localhost',
      '127.0.0.1',
      '[::1]',
      '*.example.com',
      'example.com/path',
      'https://example.com',
      'a.local',
    ])
      expect(validImageHost(h)).toBe(false);
  });
});
it('retains paused intent through failure and repair without publishing', () => {
  expect(revalidatedListingStatus('paused', false, true)).toBe('needs_changes');
  expect(revalidatedListingStatus('needs_changes', true, true)).toBe('paused');
  expect(revalidatedListingStatus('needs_changes', true, false)).toBe('ready');
  expect(revalidatedListingStatus('active', true, false)).toBe('active');
});
it('enforces all owner transitions', () => {
  expect(listingTransition('ready', 'publish', true, true)).toBe('active');
  expect(listingTransition('active', 'pause', true, true)).toBe('paused');
  expect(listingTransition('paused', 'resume', true, true)).toBe('active');
  expect(listingTransition('paused', 'publish', true, true)).toBeNull();
  expect(listingTransition('ready', 'publish', false, true)).toBeNull();
  expect(listingTransition('ready', 'publish', true, false)).toBeNull();
  expect(listingTransition('ready', 'pause', true, true)).toBeNull();
});
