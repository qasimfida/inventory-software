// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResourceState } from '@inventory/api-client';
import { defaultPreferences } from '@inventory/contracts';
import { usePageCollection } from './usePageCollection';
import { Pagination } from './Pagination';
let mode: 'pages' | 'scroll' = 'pages';
vi.mock('@/theme/Appearance', () => ({
  useAppearance: () => ({ preferences: { ...defaultPreferences, pagination: mode } }),
}));
afterEach(() => {
  cleanup();
  mode = 'pages';
});
const response = (
  ids: string[],
  busy = false,
  error = '',
): ResourceState<{ items: { id: string }[]; total: number }> => ({
  data: { items: ids.map((id) => ({ id })), total: 4 },
  busy,
  error,
});
it('retains visited rows while loading, deduplicates, and clears on filter/tenant changes', () => {
  mode = 'scroll';
  const { result, rerender } = renderHook(
    ({ state, scope, page }) => usePageCollection(state, [scope], page, ['items'], () => {}),
    { initialProps: { state: response(['a', 'b']), scope: 'tenant-a:all', page: 0 } },
  );
  rerender({ state: { ...response([]), data: null, busy: true }, scope: 'tenant-a:all', page: 2 });
  expect(result.current.data?.items.map((i) => i.id)).toEqual(['a', 'b']);
  rerender({ state: response(['b', 'c']), scope: 'tenant-a:all', page: 2 });
  expect(result.current.data?.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  expect(result.current.data?.total).toBe(4);
  rerender({ state: response(['z']), scope: 'tenant-b:all', page: 0 });
  expect(result.current.data?.items.map((i) => i.id)).toEqual(['z']);
});
it('keeps explicit pagination bounded and hides a single page', async () => {
  const change = vi.fn();
  const { rerender } = render(
    <Pagination label="products" offset={0} total={1} hasMore={false} onChange={change} />,
  );
  expect(screen.queryByRole('navigation')).toBeNull();
  rerender(<Pagination label="products" offset={0} total={80} hasMore onChange={change} />);
  await userEvent.click(screen.getByRole('button', { name: 'Page 2' }));
  expect(change).toHaveBeenCalledWith(25);
  mode = 'scroll';
  rerender(<Pagination label="products" offset={25} total={80} hasMore onChange={change} />);
  expect(screen.queryByRole('navigation')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Load more products' }));
  expect(change).toHaveBeenLastCalledWith(50);
});
