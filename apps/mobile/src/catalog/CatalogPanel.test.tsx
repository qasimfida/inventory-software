// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('../auth/client', () => ({
  authClient: {
    organizationRequest: async (path: string) =>
      path.endsWith('/categories')
        ? { items: [] }
        : { items: [], total: 0, offset: 0, limit: 25, hasMore: false },
  },
}));
import { NavigationProvider } from '../shell/Navigation';
import { CatalogPanel } from './CatalogPanel';
afterEach(cleanup);

it('renders an empty native catalog without placing an error string directly inside a View', async () => {
  const errors = vi.spyOn(console, 'error');
  try {
    render(
      <NavigationProvider>
        <CatalogPanel
          business={{
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Demo',
            role: 'owner',
            state: 'active',
            version: 1,
          }}
          locations={[]}
        />
      </NavigationProvider>,
    );
    await screen.findByText('0 products');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(errors.mock.calls.flat().join(' ')).not.toContain('Unexpected text node');
  } finally {
    errors.mockRestore();
  }
});
