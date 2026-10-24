// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business } from '@inventory/contracts';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { ReportsPanel } from './ReportsPanel';
const business: Business = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test',
  role: 'owner',
  state: 'active',
  version: 1,
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('renders exact accessible report tables and does not request invalid date ranges', async () => {
  const user = userEvent.setup();
  request.mockResolvedValue({
    section: 'sales',
    from: '2026-10-01',
    to: '2026-10-20',
    asOf: '2026-10-20T12:00:00.000Z',
    offset: 0,
    hasMore: false,
    notes: [],
    rows: [
      {
        key: 'sales:USD',
        label: 'Gross sales',
        value: '9007199254740993',
        unit: 'USD minor units',
      },
    ],
  });
  render(<ReportsPanel business={business} locations={[]} />);
  const table = await screen.findByRole('table');
  expect(screen.getByRole('region', { name: 'Report table' }).tabIndex).toBe(0);
  expect(within(table).getByText('9007199254740993')).toBeTruthy();
  expect(screen.getByLabelText('From (UTC)')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('From (UTC)'), { target: { value: '2020-01-01' } });
  await user.click(screen.getByRole('button', { name: 'Run report' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
});
it('hides financial report categories without domain permission and shows safe failures', async () => {
  request.mockRejectedValue(new Error('private server detail'));
  render(
    <ReportsPanel
      business={{ ...business, role: 'custom', permissions: ['reports.read', 'stock.read'] }}
      locations={[]}
    />,
  );
  expect(screen.queryByRole('option', { name: 'Sales' })).toBeNull();
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Unable to load data. Reconnect and retry.',
  );
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});
