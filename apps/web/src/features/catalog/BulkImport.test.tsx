import type * as ApiClient from '@inventory/api-client';
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { strToU8 } from 'fflate';
const mocks = vi.hoisted(() => ({
  templates: vi.fn(),
  saveTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  validate: vi.fn(),
  execute: vi.fn(),
  pick: vi.fn(),
}));
vi.mock('@inventory/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  createImportClient: () => mocks,
}));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: vi.fn() } }));
vi.mock('@/platform/files', () => ({ pickLocalFile: mocks.pick, saveLocalText: vi.fn() }));
import { BulkImport } from './BulkImport';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('previews source, saves mappings and requires validated explicit confirmation', async () => {
  mocks.templates.mockResolvedValue([]);
  mocks.pick.mockResolvedValue({
    name: 'supplier.csv',
    bytes: strToU8('Code,Title,Amount,Money\nSKU-1,Paint,12.50,USD'),
  });
  mocks.validate.mockResolvedValue({ errors: [] });
  mocks.execute.mockResolvedValue({
    created: 1,
    products: ['00000000-0000-4000-8000-000000000001'],
  });
  mocks.saveTemplate.mockImplementation(async (input) => ({
    ...input,
    id: '00000000-0000-4000-8000-000000000002',
    version: 1,
  }));
  const onDone = vi.fn();
  render(<BulkImport businessId="business" locations={[]} onDone={onDone} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Bulk import' }));
  await user.click(screen.getByRole('button', { name: 'Choose CSV / Excel file' }));
  expect(await screen.findByRole('region', { name: 'Original source data' })).toBeTruthy();
  expect(mocks.execute).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Continue to column mapping' }));
  for (const [field, column] of [
    ['SKU', 'Code'],
    ['Product name', 'Title'],
    ['Selling price (before tax)', 'Amount'],
    ['Currency code', 'Money'],
  ] as const) {
    await user.click(screen.getByLabelText(`Source for ${field}`));
    await user.click(screen.getByRole('option', { name: column }));
  }
  await user.type(screen.getByLabelText('Template name'), 'Supplier format');
  await user.click(screen.getByRole('button', { name: 'Create template' }));
  await waitFor(() => expect(mocks.saveTemplate).toHaveBeenCalled());
  await user.click(screen.getByRole('button', { name: 'Validate all rows' }));
  expect(await screen.findByText('1 valid rows')).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'Mapped product preview' })).getByText('12.50'),
  ).toBeTruthy();
  expect(mocks.execute).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirm import of 1 products' }));
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  expect(screen.getByText('1 created · 0 failed · 0 skipped · 0 updated.')).toBeTruthy();
  expect(mocks.execute).toHaveBeenCalledTimes(1);
});
