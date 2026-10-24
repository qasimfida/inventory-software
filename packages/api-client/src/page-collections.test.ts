import { expect, it } from 'vitest';
import { mergePageCollections } from './page-collections.js';
it('merges only declared rows, uses newest metadata, and does not sum balances', () => {
  const first = {
    page: { items: [{ id: 'a', amount: '10' }], total: 2 },
    balance: '10',
    detail: null,
  };
  const next = {
    page: {
      items: [
        { id: 'a', amount: '12' },
        { id: 'b', amount: '3' },
      ],
      total: 2,
    },
    balance: '15',
    detail: null,
  };
  const merged = mergePageCollections([first, next], ['page.items', 'detail.events']);
  expect(merged.page.items).toEqual(next.page.items);
  expect(merged.balance).toBe('15');
  expect(merged.detail).toBeNull();
  expect(first.page.items[0]?.amount).toBe('10');
});
