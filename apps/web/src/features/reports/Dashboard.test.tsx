// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  request.mockResolvedValue(readDashboard(seed, { get: () => null }, false));
  render(
    <MemoryRouter>
      <Dashboard business={seed.business} />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Top products' })).toBeTruthy();
  expect(screen.getByText('28', { exact: true })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Currency settings/ }).getAttribute('href')).toBe(
    '/settings/preferences',
  );
  await selectOption(screen.getByRole('combobox', { name: 'Overview period' }), '7');
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('days=7'),
      'GET',
      undefined,
      expect.anything(),
    ),
  );
  await userEvent.click(screen.getByText('View daily figures'));
  expect(screen.getByRole('region', { name: 'Daily sales values' })).toBeTruthy();
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
