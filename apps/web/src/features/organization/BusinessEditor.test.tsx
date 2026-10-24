// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationModel, createOrganizationClient } from '@inventory/api-client';
import { BusinessEditor } from './BusinessEditor';
import type { Business } from '@inventory/contracts';
afterEach(cleanup);
it('requires explicit archive confirmation and cancellation sends no request', async () => {
  const business: Business = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Shop',
    state: 'active',
    role: 'owner',
    version: 1,
  };
  const request = vi.fn().mockResolvedValue({ ...business, state: 'archived', version: 2 });
  const model = new OrganizationModel(createOrganizationClient(request));
  vi.spyOn(model, 'refresh').mockImplementation(async (work) => {
    await work?.();
  });
  const user = userEvent.setup();
  render(<BusinessEditor business={business} model={model} busy={false} />);
  await user.click(screen.getByRole('button', { name: 'Business status and archiving' }));
  await selectOption(screen.getByLabelText('Business state'), 'archived');
  await user.click(await screen.findByRole('button', { name: 'Save business' }));
  const dialog = screen.getByRole('alertdialog', { name: 'Archive this business?' });
  expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(request).not.toHaveBeenCalled();
  await user.click(await screen.findByRole('button', { name: 'Save business' }));
  await user.click(screen.getByRole('button', { name: 'Confirm archive' }));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(
    `/${business.id}`,
    'PATCH',
    expect.objectContaining({ state: 'archived', version: 1 }),
  );
});
