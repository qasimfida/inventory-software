import { expect, it } from 'vitest';
import { isPosSoldOut } from './pos-types.js';
it('distinguishes zero/negative stock from available, untracked and unknown products', () => {
  expect(isPosSoldOut({ available: '0.000000' })).toBe(true);
  expect(isPosSoldOut({ available: '-1' })).toBe(true);
  expect(isPosSoldOut({ available: '0.000001' })).toBe(false);
  expect(isPosSoldOut({ available: null })).toBe(false);
  expect(isPosSoldOut({})).toBe(false);
});
