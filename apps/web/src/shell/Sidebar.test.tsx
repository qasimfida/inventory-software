// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const fixture = vi.hoisted(() => ({
  routes: [
    { path: '/inventory', title: 'Inventory', group: 'Inventory' },
    { path: '/settings/profile', title: 'Profile', group: 'Settings' },
    { path: '/settings/preferences', title: 'Preferences', group: 'Settings' },
  ],
}));
vi.mock('@inventory/api-client', () => ({ availableRoutes: () => fixture.routes }));
vi.mock('./WorkspaceContext', () => ({ useWorkspace: () => ({ business: {} }) }));
vi.mock('./WorkspaceSwitcher', () => ({ WorkspaceSwitcher: () => <span>Workspace</span> }));
vi.mock('./ProfileMenu', () => ({ ProfileMenu: () => <span>Profile menu</span> }));
import { Sidebar } from './Sidebar';
afterEach(cleanup);
it('keeps single destinations direct and marks only the exact active destination', () => {
  render(
    <MemoryRouter initialEntries={['/inventory']}>
      <Sidebar collapsed={false} close={() => {}} />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('button', { name: 'Inventory' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Inventory' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('button', { name: 'Settings' })).toBeDefined();
});
it('keeps every permitted destination reachable in collapsed mode', () => {
  render(
    <MemoryRouter>
      <Sidebar collapsed close={() => {}} />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole('link')).toHaveLength(fixture.routes.length);
  expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Businesses' })).toBeNull();
});
