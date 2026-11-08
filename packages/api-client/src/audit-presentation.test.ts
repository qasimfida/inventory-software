import { expect, it } from 'vitest';
import { auditActionLabel, auditChangeDetails } from './audit-presentation.js';
it('labels event codes without inferring success or translating unknown semantics', () => {
  expect(auditActionLabel('stock.adjust')).toBe('Stock adjust');
});
it('preserves exact values, nested keys, false, zero and empty evidence', () => {
  expect(
    auditChangeDetails(
      { amountMinor: '9007199254740993', active: false, lines: [] },
      { count: 0, scope: null },
    ),
  ).toEqual([
    { label: 'Before · amountMinor', value: '9007199254740993' },
    { label: 'Before · active', value: 'false' },
    { label: 'Before · lines', value: '[]' },
    { label: 'After · count', value: '0' },
    { label: 'After · scope', value: 'Not set' },
  ]);
});
