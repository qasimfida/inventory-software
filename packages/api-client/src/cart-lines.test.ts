import { expect, it } from 'vitest';
import type { Cart } from '@inventory/contracts';
import { addCartLine } from './cart-lines.js';
const line: Cart['lines'][number] & { name: string } = {
  variantId: 'sku',
  unitId: 'each',
  quantity: '0.1',
  locationId: null,
  manualDiscountBasisPoints: 0,
  name: 'Product',
};
it('increments exact quantities without duplicating lines or mutating the original draft', () => {
  const original = [line];
  const result = addCartLine(original, { ...line, quantity: '0.2' });
  expect(result).toEqual([{ ...line, quantity: '0.3' }]);
  expect(original[0]?.quantity).toBe('0.1');
});
it('folds matching duplicate draft rows from an earlier app version into one line', () => {
  expect(addCartLine([line, { ...line, quantity: '2' }], { ...line, quantity: '1' })).toEqual([
    { ...line, quantity: '3.1' },
  ]);
});
it('keeps different variants, units, locations and discounts separate', () => {
  for (const patch of [
    { variantId: 'other' },
    { unitId: 'case' },
    { locationId: 'bin' },
    { manualDiscountBasisPoints: 500 },
  ])
    expect(addCartLine([line], { ...line, ...patch })).toHaveLength(2);
});
it('can increment at the line limit but cannot add another distinct line', () => {
  const lines = Array.from({ length: 50 }, (value, i) => {
    void value;
    return { ...line, variantId: String(i) };
  });
  expect(addCartLine(lines, { ...line, variantId: '0' })[0]?.quantity).toBe('0.2');
  expect(() => addCartLine(lines, line)).toThrow('50');
});
it('rejects invalid existing quantities and negative/zero additions without modifying the cart', () => {
  for (const quantity of ['', '-1', '0', '1e3']) {
    expect(() => addCartLine([{ ...line, quantity }], line)).toThrow();
    expect(() => addCartLine([line], { ...line, quantity })).toThrow();
  }
});
