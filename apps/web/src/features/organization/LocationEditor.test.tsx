// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createOrganizationClient, OrganizationModel } from '@inventory/api-client';
import type { Workspace } from '@inventory/contracts';
import { LocationEditor } from './LocationEditor';
const workspace: Workspace = {
  business: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Shop',
    state: 'active',
    role: 'owner',
    version: 1,
    timeZone: 'UTC',
  },
  locations: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Main till',
      code: 'TILL',
      kind: 'terminals',
      type: 'pos',
      state: 'active',
      version: 3,
      storeId: null,
      warehouseId: null,
    },
  ],
  members: [],
};
afterEach(cleanup);
function setup(data = workspace) {
  const request = vi.fn().mockResolvedValue({ ...data.locations[0], version: 4 });
  const model = new OrganizationModel(createOrganizationClient(request));
  vi.spyOn(model, 'refresh').mockImplementation(async (work) => {
    await work?.();
  });
  render(<LocationEditor model={model} workspace={data} busy={false} />);
  return { request, user: userEvent.setup() };
}
it('opens details first and edits using the existing versioned command', async () => {
  const { request, user } = setup();
  await user.click(screen.getByRole('button', { name: 'Main till' }));
  const drawer = screen.getByRole('dialog');
  expect(within(drawer).getByText('POS terminal')).toBeTruthy();
  expect(within(drawer).getByText('Revision')).toBeTruthy();
  expect(screen.queryByLabelText('Location or terminal name')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit details' }));
  await user.clear(screen.getByLabelText('Location or terminal name'));
  await user.type(screen.getByLabelText('Location or terminal name'), 'Front till');
  await user.click(screen.getByRole('button', { name: 'Save location' }));
  expect(request).toHaveBeenCalledExactlyOnceWith(
    `/${workspace.business.id}/locations/terminals/${workspace.locations[0]!.id}`,
    'PATCH',
    { name: 'Front till', code: 'TILL', state: 'active', version: 3 },
  );
});
it('requires confirmation for deactivation and archives without deleting history', async () => {
  const { request, user } = setup();
  await user.click(screen.getByRole('button', { name: 'Main till' }));
  await user.click(screen.getByRole('button', { name: 'Deactivate' }));
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Archive' }));
  await user.click(screen.getByRole('button', { name: 'Confirm archive' }));
  expect(request).toHaveBeenCalledExactlyOnceWith(
    `/${workspace.business.id}/locations/terminals/${workspace.locations[0]!.id}`,
    'PATCH',
    expect.objectContaining({ state: 'archived', version: 3 }),
  );
});
it('reactivates an inactive record after confirmation', async () => {
  const { request, user } = setup({
    ...workspace,
    locations: workspace.locations.map((item) => ({ ...item, state: 'suspended' })),
  });
  await user.click(screen.getByRole('button', { name: 'Main till' }));
  await user.click(screen.getByRole('button', { name: 'Activate' }));
  await user.click(screen.getByRole('button', { name: 'Confirm activation' }));
  expect(request).toHaveBeenCalledWith(
    expect.any(String),
    'PATCH',
    expect.objectContaining({ state: 'active', version: 3 }),
  );
});
it.each(['viewer', 'archived', 'outside-scope'] as const)(
  'keeps %s records read-only in grid and details',
  async (mode) => {
    const data: Workspace = {
      ...workspace,
      business: {
        ...workspace.business,
        ...(mode === 'viewer' ? { role: 'viewer' as const } : {}),
        ...(mode === 'outside-scope'
          ? { scope: { storeId: '00000000-0000-4000-8000-000000000099', warehouseId: null } }
          : {}),
      },
      locations: workspace.locations.map((item) => ({
        ...item,
        state: mode === 'archived' ? 'archived' : 'active',
      })),
    };
    const { request, user } = setup(data);
    await user.click(screen.getByRole('tab', { name: /grid/i }));
    await user.click(screen.getByRole('button', { name: 'Main till' }));
    expect(screen.getByLabelText('Location details')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit details' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(request).not.toHaveBeenCalled();
  },
);
