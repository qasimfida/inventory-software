// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationModel, createOrganizationClient } from '@inventory/api-client';
import type { Workspace } from '@inventory/contracts';
import { MemberEditor } from './MemberEditor';
const businessId = '00000000-0000-4000-8000-000000000001';
const storeId = '00000000-0000-4000-8000-000000000002';
const workspace: Workspace = {
  business: { id: businessId, name: 'Business', state: 'active', version: 1, role: 'owner' },
  members: [],
  locations: [
    {
      id: storeId,
      kind: 'stores',
      name: 'Assigned store',
      code: 'MAIN',
      type: 'store',
      state: 'active',
      version: 1,
      storeId: null,
      warehouseId: null,
    },
  ],
};
afterEach(cleanup);
it('assigns a cashier to the selected store with labelled controls', async () => {
  const request = vi.fn().mockResolvedValue({
    accountId: '00000000-0000-4000-8000-000000000003',
    email: 'cashier@example.test',
    role: 'cashier',
    state: 'active',
    version: 1,
    scope: { storeId, warehouseId: null },
    permissions: [],
  });
  render(
    <MemberEditor
      workspace={workspace}
      model={new OrganizationModel(createOrganizationClient(request))}
      busy={false}
    />,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Member email'), 'cashier@example.test');
  await user.selectOptions(screen.getByLabelText('Role'), 'cashier');
  await user.selectOptions(screen.getByLabelText('Access scope: store'), storeId);
  await user.click(screen.getByRole('button', { name: 'Assign member' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(`/${businessId}/members`, 'POST', {
      email: 'cashier@example.test',
      role: 'cashier',
      scope: { storeId, warehouseId: null },
      permissions: [],
    }),
  );
});
it('read-only user permission never presents assignment controls', () => {
  render(
    <MemberEditor
      workspace={{
        ...workspace,
        business: { ...workspace.business, role: 'custom', permissions: ['users.read'] },
      }}
      model={new OrganizationModel(createOrganizationClient(vi.fn()))}
      busy={false}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Assign member' })).toBeNull();
});
