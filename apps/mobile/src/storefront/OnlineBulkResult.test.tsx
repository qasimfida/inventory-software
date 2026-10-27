// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { OnlineBulkResult } from './OnlineBulkResult';
afterEach(cleanup);
it('native results distinguish warnings and failures and do not offer removed records', () => {
  const onOpen = vi.fn(),
    onTab = vi.fn();
  render(
    <OnlineBulkResult
      result={{
        ok: false,
        items: [
          { id: 'saved', ok: true, code: 'needs_changes' },
          { id: 'failed', ok: false, code: 'LISTING_CHANGED' },
          { id: 'removed', ok: true, code: 'REMOVED' },
        ],
      }}
      onClose={() => {}}
      onOpen={onOpen}
      onTab={onTab}
    />,
  );
  expect(screen.getByText('Successful products (1)')).toBeTruthy();
  expect(screen.getByText('Products with warnings (1)')).toBeTruthy();
  expect(screen.getByText('Failed products (1)')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Review product issues' }));
  expect(onOpen).toHaveBeenCalledWith('saved');
  expect(screen.queryByRole('button', { name: 'View product' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'View ready products' }));
  expect(onTab).toHaveBeenCalledWith('ready');
});
