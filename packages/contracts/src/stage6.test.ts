import { describe, it, expect } from 'vitest';
import { journalDraftSchema, periodDraftSchema } from './accounting.js';
import { tradingLineSchema } from './trading.js';
describe('Stage 6 input boundaries', () => {
  it('rejects malformed amounts, unbalanced journals and overlapping-sided lines', () => {
    const input = {
      date: '2026-10-20',
      currency: 'USD',
      reason: 'Opening balance',
      lines: [
        { account: '1000', debit: '9007199254740993', credit: '0' },
        { account: '3000', debit: '0', credit: '9007199254740993' },
      ],
    };
    expect(journalDraftSchema.safeParse(input).success).toBe(true);
    for (const amount of ['0.1', '-1', '1e10', 'NaN', '01'])
      expect(
        journalDraftSchema.safeParse({
          ...input,
          lines: [{ ...input.lines[0], debit: amount }, input.lines[1]],
        }).success,
      ).toBe(false);
    expect(
      journalDraftSchema.safeParse({
        ...input,
        lines: [{ ...input.lines[0], credit: '1' }, input.lines[1]],
      }).success,
    ).toBe(false);
    expect(journalDraftSchema.safeParse({ ...input, date: '2026-02-30' }).success).toBe(false);
    expect(periodDraftSchema.safeParse({ from: '2027-01-01', to: '2026-01-01' }).success).toBe(
      false,
    );
  });
  it('shares only explicit commercial terms and rejects zero quantities or hidden fields', () => {
    const line = {
      description: 'Shared item',
      quantity: '0.125',
      unit: 'kg',
      unitPriceMinor: '200',
    };
    expect(tradingLineSchema.safeParse(line).success).toBe(true);
    expect(tradingLineSchema.safeParse({ ...line, quantity: '0' }).success).toBe(false);
    expect(tradingLineSchema.safeParse({ ...line, inventory: 'private' }).success).toBe(false);
  });
});
