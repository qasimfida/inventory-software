import { expect, it } from 'vitest';
import { formatDecimalPrice, formatMinorUnits } from './decimal.js';
it('uses symbols or unambiguous codes without losing exact prices or minor-unit precision', () => {
  expect(formatDecimalPrice('12.500000', 'USD')).toBe('$12.50');
  expect(formatDecimalPrice('0.000001', 'USD')).toBe('$0.000001');
  expect(formatDecimalPrice('12.5', 'PKR')).toBe('PKR 12.50');
  expect(formatDecimalPrice('12', 'JPY')).toBe('¥12');
  expect(formatMinorUnits('9007199254740993', 'USD')).toBe('$90071992547409.93');
  expect(formatMinorUnits('12500', 'KWD')).toBe('KWD 12.500');
});
