import type { ExchangeSnapshot } from '@inventory/contracts';
import {
  currencyExponent,
  decimal,
  formatDecimalPrice,
  formatMinorUnits,
  roundRatio,
  SCALE,
} from './decimal.js';
export type OriginalMoney = { amount: string; currency: string; units: 'minor' | 'decimal' };
function ratio(value: string) {
  if (!/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,18})?$/.test(value)) throw new Error('Invalid rate');
  const [whole, fraction = ''] = value.split('.');
  const n = BigInt(whole! + fraction);
  if (n <= 0n) throw new Error('Invalid rate');
  return { n, d: 10n ** BigInt(fraction.length) };
}
export interface DisplayedMoney {
  text: string;
  status: 'original' | 'estimate' | 'unavailable' | 'stale';
  original: string;
  equivalent?: string;
}
/** Only accepts original, currency-denominated records. Does not return a transaction amount. */
export function displayMoney(
  original: OriginalMoney,
  target: string,
  snapshot: ExchangeSnapshot | null,
  now = Date.now(),
  offline = false,
): DisplayedMoney {
  const text =
    original.units === 'minor'
      ? formatMinorUnits(original.amount, original.currency)
      : formatDecimalPrice(original.amount, original.currency);
  if (target === original.currency) return { text, status: 'original' as const, original: text };
  const fallback = (status: 'unavailable' | 'stale') => ({
    text: `${text} · ${target} estimate ${status}`,
    status,
    original: text,
  });
  if (!snapshot) return fallback('unavailable');
  const published = Date.parse(snapshot.asOf),
    expires = Date.parse(snapshot.expiresAt);
  if (
    !Number.isFinite(published) ||
    published > now + 300000 ||
    !Number.isFinite(expires) ||
    now >= expires ||
    expires > published + 86400000
  )
    return fallback('stale');
  const source = snapshot.rates[original.currency as keyof typeof snapshot.rates];
  const dest = snapshot.rates[target as keyof typeof snapshot.rates];
  if (!source || !dest) return fallback('unavailable');
  try {
    const a = ratio(source),
      b = ratio(dest);
    const n = original.units === 'minor' ? BigInt(original.amount) : decimal(original.amount);
    const d =
      original.units === 'minor' ? 10n ** BigInt(currencyExponent(original.currency)) : SCALE;
    const minor = roundRatio(
      n * b.n * a.d * 10n ** BigInt(currencyExponent(target)),
      d * b.d * a.n,
    );
    const equivalent = formatMinorUnits(minor.toString(), target);
    return {
      text: `${text} (≈ ${equivalent}${offline ? ' · cached offline' : ''})`,
      status: 'estimate' as const,
      original: text,
      equivalent,
    };
  } catch {
    return fallback('unavailable');
  }
}
