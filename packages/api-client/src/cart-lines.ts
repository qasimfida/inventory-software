import type { Cart } from '@inventory/contracts';
import { positiveQuantitySchema } from '@inventory/contracts';
import { decimal, decimalString } from '@inventory/domain';

/** Combine only identical sale choices; never rewrite a different unit, location or discount. */
export function addCartLine<T extends Cart['lines'][number]>(
  lines: readonly T[],
  incoming: T,
): T[] {
  positiveQuantitySchema.parse(incoming.quantity);
  const matches = (line: T) =>
    line.variantId === incoming.variantId &&
    line.unitId === incoming.unitId &&
    line.locationId === incoming.locationId &&
    line.manualDiscountBasisPoints === incoming.manualDiscountBasisPoints;
  const index = lines.findIndex(matches);
  const quantity = positiveQuantitySchema.parse(
    index < 0
      ? incoming.quantity
      : decimalString(
          lines
            .filter(matches)
            .reduce(
              (total, line) => total + decimal(positiveQuantitySchema.parse(line.quantity)),
              decimal(incoming.quantity),
            ),
        ),
  );
  if (index < 0) {
    if (lines.length >= 50) throw new Error('A cart can contain up to 50 different lines.');
    return [...lines, { ...incoming, quantity }];
  }
  return lines.flatMap((line, i) =>
    i === index ? [{ ...line, quantity }] : matches(line) ? [] : [line],
  );
}
