// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { AccountingPanel } from './AccountingPanel';
const seed = createDemoSeed(0, 'owner');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('does not load accounting for a store-scoped account', () => {
  render(
    <AccountingPanel
      business={{ ...seed.business, scope: { storeId: seed.id(2), warehouseId: null } }}
    />,
  );
  expect(request).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Confirm balanced manual journal' })).toBeNull();
});
it('opens posted evidence without sending a mutation', async () => {
  request.mockResolvedValue(seed.accounting);
  render(<AccountingPanel business={seed.business} />);
  fireEvent.click(await screen.findByRole('button', { name: seed.accounting.journals[0]!.reason }));
  await screen.findByLabelText('Journal metadata');
  expect(screen.getByRole('region', { name: 'Journal lines' })).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
});
it('retries only the read after failure', async () => {
  request.mockRejectedValue(new Error('Connection unavailable'));
  render(<AccountingPanel business={seed.business} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(request.mock.calls.every((c) => !c[1] || c[1] === 'GET')).toBe(true);
});
it('opens permanent-close confirmation only for an elapsed open period without posting', async () => {
  request.mockResolvedValue({
    ...seed.accounting,
    periods: [{ id: seed.id(990), from: '2020-01-01', to: '2020-01-31', state: 'open' }],
  });
  render(<AccountingPanel business={seed.business} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm permanent period close' }));
  expect(screen.getByLabelText('Close reason (at least 10 characters)')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
});
