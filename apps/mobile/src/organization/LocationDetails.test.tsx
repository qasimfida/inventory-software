// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.mock('react-native', () => vi.importActual('react-native-web'));
import type { Location, Workspace } from '@inventory/contracts';
import { LocationDetails } from './LocationDetails';
const item: Location = {
  id: 'till',
  name: 'Main till',
  code: 'TILL',
  kind: 'terminals',
  type: 'pos',
  state: 'active',
  version: 3,
  storeId: 'store',
  warehouseId: null,
};
const workspace: Workspace = {
  business: {
    id: 'business',
    name: 'Shop',
    role: 'owner',
    state: 'active',
    version: 1,
    timeZone: 'UTC',
  },
  locations: [item, { ...item, id: 'store', name: 'Main store', kind: 'stores' }],
  members: [],
};
afterEach(cleanup);
it('shows parent details and sends a lifecycle action only after confirmation', async () => {
  const onState = vi.fn(),
    onEdit = vi.fn(),
    user = userEvent.setup();
  render(
    <LocationDetails
      item={item}
      workspace={workspace}
      busy={false}
      onState={onState}
      onEdit={onEdit}
    />,
  );
  expect(screen.getByText('Main store')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Edit details' }));
  expect(onEdit).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', { name: 'Deactivate' }));
  expect(onState).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirm deactivation' }));
  expect(onState).toHaveBeenCalledExactlyOnceWith('suspended');
});
it.each(['viewer', 'archived', 'outside-scope'] as const)(
  'hides unauthorized actions for %s',
  (mode) => {
    const data: Workspace = {
      ...workspace,
      business: {
        ...workspace.business,
        ...(mode === 'viewer' ? { role: 'viewer' as const } : {}),
        ...(mode === 'outside-scope'
          ? { scope: { storeId: 'different-store', warehouseId: null } }
          : {}),
      },
    };
    render(
      <LocationDetails
        item={{ ...item, state: mode === 'archived' ? 'archived' : 'active' }}
        workspace={data}
        busy={false}
        onState={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('TILL')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit details' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
  },
);
