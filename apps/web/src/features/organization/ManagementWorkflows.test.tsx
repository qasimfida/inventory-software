// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import type { Business } from '@inventory/contracts';
import { ManagementWorkflows } from './ManagementWorkflows';

vi.mock('../catalog/CatalogPanel', () => ({
  CatalogPanel: () => (
    <label>
      Product draft
      <input />
    </label>
  ),
}));
const business: Business = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Example shop',
  state: 'active',
  role: 'owner',
  version: 1,
};
afterEach(cleanup);

it('opens workflows from keyboard navigation and keeps drafts while switching sections', async () => {
  const user = userEvent.setup();
  render(
    <ManagementWorkflows business={business} locations={[]} administration={<p>Settings</p>} />,
    { wrapper: MemoryRouter },
  );
  expect(screen.getByRole('region', { name: 'Workspace overview' })).toBeTruthy();
  expect(screen.queryByLabelText('Product draft')).toBeNull();
  const navigation = within(screen.getByRole('navigation', { name: 'Workspace sections' }));
  const catalog = navigation.getByRole('button', { name: 'Catalog & pricing' });
  catalog.focus();
  await user.keyboard('{Enter}');
  expect(catalog.getAttribute('aria-current')).toBe('page');
  await user.type(await screen.findByLabelText('Product draft'), 'Unsaved product');
  await user.click(navigation.getByRole('button', { name: 'Business & access' }));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByText('Settings')).toBeTruthy();
  await user.click(catalog);
  expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('Unsaved product');
});

it('removes restricted workflows when access changes and explains limited access', async () => {
  const props = { locations: [], administration: <p>Settings</p> };
  const view = render(<ManagementWorkflows {...props} business={business} />, {
    wrapper: MemoryRouter,
  });
  const navigation = within(screen.getByRole('navigation', { name: 'Workspace sections' }));
  await userEvent.click(navigation.getByRole('button', { name: 'Catalog & pricing' }));
  view.rerender(<ManagementWorkflows {...props} business={{ ...business, role: 'viewer' }} />);
  expect(screen.queryByLabelText('Product draft')).toBeNull();
  expect(navigation.queryByRole('button', { name: 'Catalog & pricing' })).toBeNull();
  expect(screen.getByText(/No transaction sections are available/)).toBeTruthy();
  expect(navigation.getByRole('button', { name: 'Overview' }).getAttribute('aria-current')).toBe(
    'page',
  );
});
