import { expect, it } from 'vitest';
import { priceLine, baseQuantity } from './pricing.js';
import { formatMinorUnits, percentageBasisPoints } from './decimal.js';
it('calculates discounts and tax exactly without intermediate floating-point rounding', () => {
  expect(
    priceLine({
      quantity: '3',
      unitPrice: '1.005',
      currency: 'USD',
      discountBasisPoints: 0,
      taxBasisPoints: 0,
      taxInclusive: false,
    }),
  ).toEqual({ netMinor: '302', taxMinor: '0', totalMinor: '302' });
  expect(
    priceLine({
      quantity: '1',
      unitPrice: '110',
      currency: 'USD',
      discountBasisPoints: 0,
      taxBasisPoints: 1000,
      taxInclusive: true,
    }),
  ).toEqual({ netMinor: '10000', taxMinor: '1000', totalMinor: '11000' });
  expect(
    priceLine({
      quantity: '24',
      unitPrice: '8',
      currency: 'USD',
      discountBasisPoints: 1000,
      taxBasisPoints: 1000,
      taxInclusive: false,
    }),
  ).toEqual({ netMinor: '17280', taxMinor: '1728', totalMinor: '19008' });
  expect(baseQuantity('2', '12', '1')).toBe('24');
  expect(() => baseQuantity('1', '1', '3')).toThrow();
  expect(formatMinorUnits('19008', 'USD')).toBe('$190.08');
  expect(percentageBasisPoints('12.25')).toBe(1225);
  expect(() => percentageBasisPoints('12.255')).toThrow();
});

it('rejects totals outside the wire minor-amount precision', () => {
  expect(() =>
    priceLine({
      quantity: '999999999999999999',
      unitPrice: '999999999999999999',
      currency: 'CLF',
      discountBasisPoints: 0,
      taxBasisPoints: 0,
      taxInclusive: false,
    }),
  ).toThrow('Minor amount overflow');
});
