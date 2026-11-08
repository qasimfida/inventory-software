// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../../packages/api-client/src/mock/read-commerce';
import { businessTime } from '@inventory/contracts';
const { request, print } = vi.hoisted(() => ({
  request: vi.fn(),
  print: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
vi.mock('@/platform/receipt-printer', () => ({ printReceipt: print }));
import { ReceiptPanel } from './ReceiptPanel';
import { receiptText } from '@inventory/api-client';
const seed = createDemoSeed(0, 'owner');
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('allows read-only receipt printing without exposing corrections or writing a sale', async () => {
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    return readCommerce(seed, url.pathname.split('/').slice(2).join('/'), url.searchParams, false);
  });
  render(<ReceiptPanel business={{ ...seed.business, role: 'viewer' }} warehouseId={seed.id(3)} />);
  await userEvent.click(
    (
      await screen.findAllByRole('button', {
        name: businessTime(seed.sales[0]!.sale.createdAt, seed.business.timeZone),
      })
    )[0]!,
  );
  expect(screen.queryByRole('tab', { name: /grid/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /receipts grid/i })).toBeNull();
  const printAction = await screen.findByRole('button', { name: 'Print / reprint receipt' });
  expect(screen.queryByRole('button', { name: 'Return selected sale line' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Void full sale' })).toBeNull();
  await userEvent.click(printAction);
  expect(print).toHaveBeenCalledWith(receiptText(seed.sales[0]!));
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
