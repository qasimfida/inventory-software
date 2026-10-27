import { decimal, decimalString } from './decimal.js';
/** Buffer is applied once to the eligible allocation pool, never per balance row. */
export function sellableStock(onHand: string, reserved: string, damaged: string, buffer = '0') {
  const safety = decimal(buffer);
  if (safety < 0n) throw new Error('Safety buffer must be nonnegative');
  return decimalString(decimal(onHand) - decimal(reserved) - decimal(damaged) - safety);
}
