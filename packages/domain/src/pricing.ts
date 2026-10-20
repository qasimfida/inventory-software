import { decimal, decimalString, SCALE, currencyExponent, roundRatio } from './decimal.js';
export function priceLine(input: {
  quantity: string;
  unitPrice: string;
  currency: string;
  discountBasisPoints: number;
  taxBasisPoints: number;
  taxInclusive: boolean;
}) {
  const quantity = decimal(input.quantity),
    price = decimal(input.unitPrice);
  if (
    quantity <= 0n ||
    price < 0n ||
    ![input.discountBasisPoints, input.taxBasisPoints].every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 10000,
    )
  )
    throw new Error('Invalid price input');
  const discounted = quantity * price * BigInt(10000 - input.discountBasisPoints);
  const scale = SCALE * SCALE * 10000n,
    minor = 10n ** BigInt(currencyExponent(input.currency));
  const rate = BigInt(input.taxBasisPoints);
  let net: bigint, total: bigint;
  if (input.taxInclusive) {
    total = roundRatio(discounted * minor, scale);
    net = roundRatio(discounted * minor * 10000n, scale * (10000n + rate));
  } else {
    net = roundRatio(discounted * minor, scale);
    total = net + roundRatio(discounted * minor * rate, scale * 10000n);
  }
  if (total > 999_999_999_999_999_999_999_999n) throw new Error('Minor amount overflow');
  return {
    netMinor: net.toString(),
    taxMinor: (total - net).toString(),
    totalMinor: total.toString(),
  };
}
export function baseQuantity(quantity: string, numerator: string, denominator: string) {
  const q = decimal(quantity),
    n = decimal(numerator),
    d = decimal(denominator);
  if (q <= 0n || n <= 0n || d <= 0n || (q * n) % d)
    throw new Error('Invalid or inexact unit conversion');
  return decimalString((q * n) / d);
}
