import { apiErrorSchema } from '@inventory/contracts';
import { AuthenticationError } from './auth.js';
import { expect, it } from 'vitest';
import { notificationTime } from './notification-time.js';
import { recordsCsv } from './catalog-export.js';
it('formats recent activity and business-local dates', () => {
  const now = Date.parse('2026-11-02T10:00:00Z');
  expect(notificationTime('2026-11-02T09:59:40Z', 'Asia/Karachi', now)).toBe('Just now');
  expect(notificationTime('2026-11-02T09:58:00Z', 'Asia/Karachi', now)).toBe('2 minutes ago');
  expect(notificationTime('2026-11-02T08:00:00Z', 'Asia/Karachi', now)).toBe('2 hours ago');
  expect(notificationTime('2026-11-01T08:00:00Z', 'Asia/Karachi', now)).toBe('Yesterday');
  expect(notificationTime('2026-10-20T06:00:00Z', 'Asia/Karachi', now)).toContain('20 Oct 2026');
});
it('exports only supplied rows and escapes spreadsheet formulas and quotes', () => {
  expect(recordsCsv(['Name'], [['=SUM(A1)'], ['a"b']])).toBe('"Name"\r\n"\'=SUM(A1)"\r\n"a""b"');
});

it('preserves allowlisted checkout guidance through runtime API validation', () => {
  for (const code of [
    'CASH_SHIFT_REQUIRED',
    'QUOTE_CHANGED',
    'STOCK_UNAVAILABLE',
    'PAYMENT_ALLOCATION_INVALID',
  ]) {
    const details = apiErrorSchema.parse({
      code,
      message: 'Review this checkout',
      requestId: '00000000-0000-4000-8000-000000000001',
      retryable: false,
    });
    expect(new AuthenticationError(409, details).message).toBe('Review this checkout');
  }
});
