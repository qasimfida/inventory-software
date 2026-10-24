import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { journalDraftSchema } from '@inventory/contracts';
import type { AccountingSource } from '@inventory/contracts';
import { sourceLines } from './sources.js';
describe('exact source posting rules', () => {
  const source: AccountingSource = {
    id: randomUUID(),
    kind: 'sale',
    date: '2026-10-20',
    currency: 'USD',
    amount: '1100',
    net: '1000',
    tax: '100',
    direction: 'payment',
  };
  it.each([
    'sale',
    'sale_return',
    'cash_payment',
    'cash_refund',
    'supplier_invoice',
    'supplier_credit',
    'supplier_settlement',
  ] as const)('balances %s without floating point', (kind) => {
    for (const direction of ['payment', 'refund'] as const) {
      const lines = sourceLines({ ...source, kind, direction });
      expect(
        journalDraftSchema.safeParse({
          date: source.date,
          currency: 'USD',
          reason: 'Confirmed source posting',
          lines,
        }).success,
      ).toBe(true);
      expect(lines.reduce((n, l) => n + BigInt(l.debit), 0n)).toBe(1100n);
    }
  });
  it('keeps tax separate and avoids counting cash as a second sale', () => {
    expect(sourceLines(source)).toEqual([
      { account: '1100', debit: '1100', credit: '0' },
      { account: '4000', debit: '0', credit: '1000' },
      { account: '2100', debit: '0', credit: '100' },
    ]);
    expect(sourceLines({ ...source, kind: 'cash_payment' }).map((l) => l.account)).toEqual([
      '1000',
      '1100',
    ]);
    expect(sourceLines({ ...source, amount: '0', net: '0', tax: '0' })).toEqual([]);
  });
});
