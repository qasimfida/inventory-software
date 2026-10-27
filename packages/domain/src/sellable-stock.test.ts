import { it, expect } from 'vitest';
import { sellableStock } from './sellable-stock.js';
it('subtracts reserved damaged and one buffer exactly without clamping deficits', () => {
  expect(sellableStock('10.5', '2', '1.25', '3')).toBe('4.25');
  expect(sellableStock('0', '0', '0', '1')).toBe('-1');
  expect(() => sellableStock('1', '0', '0', '-1')).toThrow();
});
