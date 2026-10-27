import { expect, it } from 'vitest';
import { companyProfileSchema } from './company-profile.js';
import { safePolicy } from './settings.js';
it('preserves explicit zero tax and separates unconfigured defaults from existing profiles', () => {
  const legacy = companyProfileSchema.parse({ displayName: 'Existing' });
  expect(legacy.transactionCurrency).toBeNull();
  expect(legacy.taxBasisPoints).toBeNull();
  expect(legacy.receiptFooter).toBe('');
  const profile = companyProfileSchema.parse({
    transactionCurrency: 'PKR',
    taxBasisPoints: 0,
    taxInclusive: true,
    receiptFooter: '  Thank you  ',
  });
  expect(safePolicy({ company: profile }).company).toEqual(profile);
  expect(profile.receiptFooter).toBe('Thank you');
  for (const invalid of [
    { taxBasisPoints: -1 },
    { taxBasisPoints: 0.5 },
    { taxBasisPoints: 10001 },
    { transactionCurrency: 'BAD' },
    { receiptFooter: 'x'.repeat(501) },
  ])
    expect(companyProfileSchema.safeParse(invalid).success).toBe(false);
});
