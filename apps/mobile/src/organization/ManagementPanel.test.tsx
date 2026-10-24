// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.mock('expo-print', () => ({ printAsync: vi.fn() }));
vi.mock('../reports/Dashboard', () => ({ Dashboard: () => null }));
vi.mock('../customers/CustomerPanel', () => ({ CustomerPanel: () => null }));
vi.mock('../transfers/TransferPanel', () => ({ TransferPanel: () => null }));
vi.mock('../storage/StoragePanel', () => ({ StoragePanel: () => null }));
vi.mock('../purchasing/PurchasingPanel', () => ({ PurchasingPanel: () => null }));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../inventory/InventoryPanel', () => ({ InventoryPanel: () => null }));
vi.mock('../catalog/CatalogPanel', () => ({
  CatalogPanel: () => <input aria-label="Native catalog draft" />,
}));
vi.mock('react-native', () => vi.importActual('react-native-web'));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { ManagementPanel } from './ManagementPanel';
const business = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Native business',
  role: 'viewer',
  state: 'active',
  version: 1,
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('automatically opens native membership-scoped management and hides owner and manager actions for viewers', async () => {
  request
    .mockResolvedValueOnce({ businesses: [business] })
    .mockResolvedValueOnce({ business, locations: [], members: [] });
  render(<ManagementPanel />);
  await screen.findByText('Native business');
  await userEvent.click(await screen.findByRole('button', { name: 'Business & access' }));
  await screen.findByText('No locations or terminals yet.');
  expect(screen.queryByText('Assign member')).toBeNull();
  expect(screen.queryByText('Create location')).toBeNull();
  expect(request).toHaveBeenLastCalledWith('/' + business.id);
});

it('defers native workflows until selected and preserves drafts across section changes', async () => {
  const owned = { ...business, role: 'owner' };
  request
    .mockResolvedValueOnce({ businesses: [owned] })
    .mockResolvedValueOnce({ business: owned, locations: [], members: [] });
  render(<ManagementPanel />);
  await userEvent.click(await screen.findByRole('button', { name: 'Workspace sections' }));
  const catalog = await screen.findByRole('button', { name: 'Catalog & pricing' });
  expect(screen.queryByLabelText('Native catalog draft')).toBeNull();
  const user = userEvent.setup();
  await user.click(catalog);
  await user.type(screen.getByLabelText('Native catalog draft'), 'Unsubmitted draft');
  await user.click(screen.getByRole('button', { name: /Workspace sections/ }));
  await user.click(screen.getByRole('button', { name: 'Inventory' }));
  expect(screen.queryByRole('textbox', { name: 'Native catalog draft' })).toBeNull();
  await user.click(screen.getByRole('button', { name: /Workspace sections/ }));
  await user.click(screen.getByRole('button', { name: 'Catalog & pricing' }));
  expect(
    screen.getByRole<HTMLInputElement>('textbox', { name: 'Native catalog draft' }).value,
  ).toBe('Unsubmitted draft');
  expect(request).toHaveBeenCalledTimes(2);
});
it('creates a business and store using labelled native inputs and server-confirmed responses', async () => {
  const owned = { ...business, role: 'owner' };
  const location = {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Native branch',
    code: 'MAIN',
    kind: 'stores',
    type: 'store',
    state: 'active',
    version: 1,
    storeId: null,
    warehouseId: null,
  };
  request
    .mockResolvedValueOnce({ businesses: [] })
    .mockResolvedValueOnce(owned)
    .mockResolvedValueOnce({ businesses: [owned] })
    .mockResolvedValueOnce({ business: owned, locations: [], members: [] })
    .mockResolvedValueOnce(location)
    .mockResolvedValueOnce({ businesses: [owned] })
    .mockResolvedValueOnce({ business: owned, locations: [location], members: [] });
  render(<ManagementPanel />);
  await screen.findByText(/No active memberships/);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('New business name'), owned.name);
  await user.click(screen.getByRole('button', { name: 'Create business' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Business & access' }));
  await screen.findByText('No locations or terminals yet.');
  await user.click(screen.getByRole('button', { name: 'Add store / warehouse / terminal' }));
  await user.type(screen.getByLabelText('Location or terminal name'), 'Native branch');
  await user.type(screen.getByLabelText('Code (letters, numbers, underscore or hyphen)'), 'main');
  await user.click(screen.getByRole('button', { name: 'Create location' }));
  await screen.findByRole('button', { name: 'Native branch' });
  expect(request).toHaveBeenCalledWith('/' + owned.id + '/locations', 'POST', {
    name: 'Native branch',
    code: 'MAIN',
    kind: 'stores',
    type: 'store',
  });
});
