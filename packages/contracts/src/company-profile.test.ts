import { expect, it } from 'vitest';
import { companyProfileSchema } from './company-profile.js';
import { locationIdsSchema } from './location-selection.js';
it('accepts bounded company branding but rejects active or remote logo content', () => {
  expect(companyProfileSchema.parse({ displayName: '  Company  ' }).displayName).toBe('Company');
  for (const logo of [
    'https://example.com/logo.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,' + 'A'.repeat(80000),
  ])
    expect(companyProfileSchema.safeParse({ logo }).success).toBe(false);
  expect(companyProfileSchema.safeParse({ website: 'http://example.com' }).success).toBe(false);
  expect(companyProfileSchema.safeParse({ palette: [] }).success).toBe(false);
});
it('validates and deduplicates location query IDs, retaining an explicit empty scope', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  expect(locationIdsSchema.parse(`${id},${id}`)).toEqual([id]);
  expect(locationIdsSchema.parse('')).toEqual([]);
  expect(locationIdsSchema.parse(undefined)).toBeUndefined();
  expect(locationIdsSchema.safeParse('foreign').success).toBe(false);
});
