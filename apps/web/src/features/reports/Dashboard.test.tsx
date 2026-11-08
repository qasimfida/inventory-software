// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { readDashboard } from '../../../../../packages/api-client/src/mock/read-dashboard';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { Dashboard } from './Dashboard';
const seed = createDemoSeed(0, 'owner');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('shows confirmed metrics, bounded previews and a keyboard-accessible exact trend table', async () => {
  request.mockImplementation(async (path: string) =>
    readDashboard(seed, new URL(path, 'http://test.local').searchParams, false),
  );
  render(
    <MemoryRouter>
      <Dashboard business={seed.business} />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Top products' })).toBeTruthy();
  expect(screen.getByText('28', { exact: true })).toBeTruthy();
  expect(screen.getByRole('combobox', { name: 'Overview recorded currency' })).toBeTruthy();
  expect(document.querySelectorAll('.overview-chart circle[data-date]')).toHaveLength(30);
  await selectOption(screen.getByRole('combobox', { name: 'Overview period' }), '7');
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('days=7'),
      'GET',
      undefined,
      expect.anything(),
    ),
  );
  await waitFor(() =>
    expect(document.querySelectorAll('.overview-chart circle[data-date]')).toHaveLength(7),
  );
  expect(screen.queryByText('View daily figures')).toBeNull();
  const data = readDashboard(seed, new URLSearchParams({ days: '7' }), false);
  expect(
    within(screen.getByRole('region', { name: 'Sales trend' })).getByText(
      `${data.from} – ${data.to} UTC`,
    ),
  ).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'Daily sales values' })).getAllByRole('row'),
  ).toHaveLength(8);
  await selectOption(screen.getByRole('combobox', { name: 'Overview period' }), '30');
  await waitFor(() =>
    expect(document.querySelectorAll('.overview-chart circle[data-date]')).toHaveLength(30),
  );
});
it('keeps restricted sections absent and shows request failures rather than invented totals', async () => {
  request.mockResolvedValue({ ...readDashboard(seed, { get: () => null }, false), sales: null });
  render(
    <MemoryRouter>
      <Dashboard business={seed.business} />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Inventory snapshot' })).toBeTruthy();
  expect(screen.queryByText('Sales today')).toBeNull();
  request.mockRejectedValue(new Error('Unavailable'));
  await userEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
});
