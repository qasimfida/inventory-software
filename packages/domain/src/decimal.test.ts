import { expect, it } from 'vitest';
import { decimal, decimalString, toMinorUnits, convertQuantity, roundRatio } from './decimal.js';
it('rounds exact decimal currency amounts half away from zero at explicit currency boundaries', () => {
  expect(toMinorUnits('1.005', 'USD')).toBe('101');
  expect(toMinorUnits('-1.005', 'USD')).toBe('-101');
  expect(toMinorUnits('1.5', 'JPY')).toBe('2');
  expect(toMinorUnits('1.2345', 'KWD')).toBe('1235');
  expect(toMinorUnits('1.23455', 'CLF')).toBe('12346');
  expect(() => toMinorUnits('1', 'BAD')).toThrow();
  expect(roundRatio(1n, 3n)).toBe(0n);
});
it('preserves exact quantities and rejects ambiguous precision, exponent notation and zero conversions', () => {
  expect(decimalString(decimal('0.1') + decimal('0.2'))).toBe('0.3');
  expect(convertQuantity('2', '12', '1')).toBe('24');
  expect(convertQuantity('1500', '1', '1000')).toBe('1.5');
  expect(() => convertQuantity('1', '1', '3')).toThrow();
  expect(() => convertQuantity('1', '0', '1')).toThrow();
  for (const value of ['1e3', 'NaN', '1.0000001', '1000000000000000000'])
    expect(() => decimal(value)).toThrow();
});
