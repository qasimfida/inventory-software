import { expect, it } from 'vitest';
import { paymentAllocation } from './payment-allocation.js';
it('shows exact cash, unpaid credit and change without floating point', () => {
  expect(paymentAllocation('1000', '400', '500', true)).toEqual({
    cash: '400',
    credit: '600',
    change: '100',
    error: '',
  });
  expect(paymentAllocation('1000', '0', '0', true).credit).toBe('1000');
  expect(paymentAllocation('999999999999999999999999', '1', '2', true).credit).toBe(
    '999999999999999999999998',
  );
  expect(paymentAllocation('0', '0', '0', false).error).toBe('');
});
it('rejects malformed, impossible and walk-in credit allocations', () => {
  for (const args of [
    ['10', '11', '11', true],
    ['10', '5', '4', true],
    ['10', '0', '1', true],
    ['10', '5', '5', false],
    ['10', '1.1', '2', true],
    ['10', '-1', '0', true],
  ] as const)
    expect(paymentAllocation(args[0], args[1], args[2], args[3]).error).not.toBe('');
});
