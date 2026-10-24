import { decimal, decimalString, SCALE } from '@inventory/domain';
/** Step exactly one selected unit; keep fractional entry and server validation intact. */
export function stepQuantity(value: string, direction: 1 | -1): string | null {
  try {
    const next = decimal(value) + BigInt(direction) * SCALE;
    return next > 0n ? decimalString(next) : null;
  } catch {
    return null;
  }
}
