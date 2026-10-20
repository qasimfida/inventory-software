import { expect, it } from 'vitest';
import { decimalSchema, pageQuerySchema, timeZoneSchema, businessTime } from './conventions.js';
it('bounds pagination, filters and exact decimal input', () => {
  expect(pageQuerySchema.parse({})).toMatchObject({
    limit: 25,
    offset: 0,
    sort: 'name',
    direction: 'asc',
  });
  for (const value of [
    { limit: 101 },
    { sort: 'password' },
    { offset: -1 },
    { businessId: 'forged' },
  ])
    expect(pageQuerySchema.safeParse(value).success).toBe(false);
  expect(decimalSchema.safeParse(0.1).success).toBe(false);
  expect(decimalSchema.safeParse('0.1').success).toBe(true);
});
it('validates time zones and displays an explicit business-local zone', () => {
  expect(timeZoneSchema.safeParse('Bad/Zone').success).toBe(false);
  expect(businessTime('2026-01-01T00:00:00Z', 'Asia/Karachi')).toContain('Asia/Karachi');
});
