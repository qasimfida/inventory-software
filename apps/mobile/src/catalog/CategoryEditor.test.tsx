// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCatalogClient } from '@inventory/api-client';
import { CategoryEditor } from './CategoryEditor';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
afterEach(cleanup);
it('filters existing status and parent fields while keeping the selected view', async () => {
  const request = vi.fn();
  const client = createCatalogClient(request, '00000000-0000-4000-8000-000000000001');
  const items = [
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Furniture',
      state: 'active' as const,
      parentId: null,
      version: 1,
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Chairs',
      state: 'inactive' as const,
      parentId: '00000000-0000-4000-8000-000000000002',
      version: 1,
    },
  ];
  render(<CategoryEditor items={items} client={client} run={vi.fn()} />);
  await userEvent.click(screen.getByRole('tab', { name: /grid/i }));
  await userEvent.click(screen.getByRole('button', { name: 'Category status filter' }));
  await userEvent.click(screen.getByRole('radio', { name: 'Category status filter: inactive' }));
  expect(screen.queryByRole('button', { name: 'Furniture' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Chairs' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('button', { name: 'Furniture' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: /grid/i }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('button', { name: 'Add category' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Export shown records' })).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});
