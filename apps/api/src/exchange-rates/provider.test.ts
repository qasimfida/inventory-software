import { expect, it } from 'vitest';
import { parseProvider } from './provider.js';
const now = Date.parse('2026-11-08T00:00:00Z');
it('keeps the provider decimal literals exact, including precision beyond Number', () => {
  const data = parseProvider(
    `{"base":"USD","timestamp":${now / 1000},"rates":{"USD":1,"PKR":280.123456789123456789,"KWD":0.300000000000000001,"XYZ":12}}`,
    now,
  );
  expect(data.rates.PKR).toBe('280.123456789123456789');
  expect(data.rates.KWD).toBe('0.300000000000000001');
  expect(data.expiresAt).toBe(new Date(now + 86400000).toISOString());
});
it('rejects invalid bases, rates, timestamps and malformed responses', () => {
  for (const body of [
    '{}',
    'not json',
    `{"base":"EUR","timestamp":${now / 1000},"rates":{"USD":1}}`,
    `{"base":"USD","timestamp":${now / 1000},"rates":{"USD":1,"PKR":0}}`,
    `{"base":"USD","timestamp":${now / 1000 + 900},"rates":{"USD":1}}`,
  ])
    expect(() => parseProvider(body, now)).toThrow();
});
