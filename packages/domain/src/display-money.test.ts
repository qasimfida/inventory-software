import { expect, it } from 'vitest';
import { exchangeSnapshotSchema } from '@inventory/contracts';
import { displayMoney } from './display-money.js';
const now = Date.parse('2026-11-08T00:00:00Z');
// Explicit deterministic fixtures, not production/live rates.
const snapshot = exchangeSnapshotSchema.parse({
  source: 'Open Exchange Rates',
  base: 'USD',
  asOf: new Date(now).toISOString(),
  fetchedAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 86400000).toISOString(),
  rates: { USD: '1', PKR: '280', JPY: '150', KWD: '0.3', CLF: '0.03' },
});
const show = (
  amount: string,
  currency: string,
  target: string,
  units: 'minor' | 'decimal' = 'decimal',
) => displayMoney({ amount, currency, units }, target, snapshot, now);
it('converts both directions from original amounts without changing them', () => {
  expect(show('3', 'USD', 'PKR').equivalent).toBe('PKR 840.00');
  expect(show('840', 'PKR', 'USD').equivalent).toBe('$3.00');
  expect(show('84000', 'PKR', 'USD', 'minor').equivalent).toBe('$3.00');
  expect(show('840', 'PKR', 'USD').original).toBe('PKR 840.00');
});
it('rounds once half away from zero at currency precision using integers', () => {
  expect(show('0.01', 'USD', 'JPY').equivalent).toBe('¥2');
  expect(show('-0.01', 'USD', 'JPY').equivalent).toBe('¥-2');
  expect(show('0.000001', 'USD', 'PKR').equivalent).toBe('PKR 0.00');
  expect(show('3', 'USD', 'KWD').equivalent).toBe('KWD 0.900');
  expect(show('3', 'USD', 'CLF').equivalent).toBe('CLF 0.0900');
  expect(show('0', 'USD', 'PKR').equivalent).toBe('PKR 0.00');
  expect(show('9007199254740993', 'USD', 'PKR', 'minor').equivalent).toBe(
    'PKR 25220157913274780.40',
  );
});
it('uses originals for missing pairs, expired/unavailable rates and keeps same-currency values exact', () => {
  expect(show('1', 'EUR', 'PKR').status).toBe('unavailable');
  expect(
    displayMoney({ amount: '3', currency: 'USD', units: 'decimal' }, 'PKR', null, now).text,
  ).toContain('$3.00');
  expect(
    displayMoney(
      { amount: '3', currency: 'USD', units: 'decimal' },
      'PKR',
      snapshot,
      now + 86400000,
    ).status,
  ).toBe('stale');
  expect(
    displayMoney({ amount: '0.000001', currency: 'USD', units: 'decimal' }, 'USD', null, now).text,
  ).toBe('$0.000001');
});
it('updates rates without reusing a converted amount and labels bounded offline estimates', () => {
  const original = { amount: '3', currency: 'USD', units: 'decimal' as const };
  const updated = { ...snapshot, rates: { ...snapshot.rates, PKR: '300' } };
  expect(displayMoney(original, 'PKR', updated, now).equivalent).toBe('PKR 900.00');
  expect(displayMoney(original, 'PKR', snapshot, now, true).text).toContain('cached offline');
  expect(displayMoney(original, 'PKR', snapshot, now + 86400000, true).status).toBe('stale');
  expect(original.amount).toBe('3');
});
