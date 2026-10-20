export const SCALE = 1_000_000n;
export const CURRENCY_EXPONENT = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  PKR: 2,
  JPY: 0,
  KWD: 3,
  CLF: 4,
} as const;
export type Currency = keyof typeof CURRENCY_EXPONENT;
// Canonical decimal strings: up to 18 integer digits and 6 fractional digits; no exponent notation.
export function decimal(value: string): bigint {
  if (!/^-?(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/.test(value))
    throw new Error('Invalid exact decimal');
  const negative = value.startsWith('-');
  const [whole = '0', fraction = ''] = (negative ? value.slice(1) : value).split('.');
  return (BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'))) * (negative ? -1n : 1n);
}
export function decimalString(value: bigint): string {
  const abs = value < 0n ? -value : value;
  const whole = abs / SCALE;
  if (whole > 999_999_999_999_999_999n) throw new Error('Decimal overflow');
  const fraction = (abs % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return `${value < 0n ? '-' : ''}${whole}${fraction ? '.' + fraction : ''}`;
}
export function roundRatio(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('Invalid denominator');
  const sign = numerator < 0n ? -1n : 1n;
  const value = numerator * sign;
  return sign * ((value + denominator / 2n) / denominator);
}
export function currencyExponent(currency: string): number {
  if (!Object.hasOwn(CURRENCY_EXPONENT, currency)) throw new Error('Unsupported currency');
  return CURRENCY_EXPONENT[currency as Currency];
}
export function toMinorUnits(amount: string, currency: string): string {
  return roundRatio(decimal(amount), 10n ** BigInt(6 - currencyExponent(currency))).toString();
}
export function convertQuantity(quantity: string, numerator: string, denominator: string): string {
  const n = decimal(numerator),
    d = decimal(denominator),
    q = decimal(quantity);
  if (n <= 0n || d <= 0n || q < 0n) throw new Error('Invalid conversion');
  if ((q * n) % d !== 0n) throw new Error('Conversion exceeds six-decimal quantity precision');
  return decimalString((q * n) / d);
}
export function formatMinorUnits(amount: string, currency: string): string {
  if (!/^-?(0|[1-9][0-9]*)$/.test(amount)) throw new Error('Invalid minor amount');
  const exponent = currencyExponent(currency),
    value = BigInt(amount),
    abs = value < 0n ? -value : value,
    divisor = 10n ** BigInt(exponent);
  return `${currency} ${value < 0n ? '-' : ''}${abs / divisor}${exponent ? '.' + (abs % divisor).toString().padStart(exponent, '0') : ''}`;
}
export function percentageBasisPoints(value: string): number {
  const scaled = decimal(value);
  if (scaled < 0n || scaled > 100n * SCALE || scaled % 10000n)
    throw new Error('Percentage must be between 0 and 100 with at most two decimals');
  return Number(scaled / 10000n);
}
