// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { readStaff } from '../../../../../packages/api-client/src/mock/read-staff';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { StaffDirectory } from './StaffDirectory';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('keeps salary out of directory/search and loads authorized compensation only for a profile', async () => {
  const seed = createDemoSeed(0, 'owner');
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    return readStaff(seed, url.pathname.split('/').slice(2).join('/'), url.searchParams, false);
  });
  render(
    <MemoryRouter>
      <StaffDirectory business={seed.business} locations={seed.locations} />
    </MemoryRouter>,
  );
  expect(screen.queryByText('No matching staff directory.')).toBeNull();
  await screen.findByRole('button', { name: seed.staff[0]!.name });
  expect(request.mock.calls.every((c) => String(c[0]).includes('/operations/staff?'))).toBe(true);
  expect(screen.queryByText('Base salary per pay period')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: seed.staff[0]!.name }));
  await screen.findByText('Base salary per pay period');
  await waitFor(() =>
    expect(
      request.mock.calls.some((c) => String(c[0]).endsWith('/staff/' + seed.staff[0]!.id)),
    ).toBe(true),
  );
  expect(request.mock.calls.every((c) => !c[1] || c[1] === 'GET')).toBe(true);
});

it('shows a retryable read failure instead of an empty staff directory', async () => {
  const seed = createDemoSeed(0, 'owner');
  request.mockRejectedValue(new Error('Disconnected'));
  render(
    <MemoryRouter>
      <StaffDirectory business={seed.business} locations={seed.locations} />
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(screen.queryByText('No matching staff directory.')).toBeNull();
  expect(request.mock.calls.length).toBeGreaterThan(1);
  expect(request.mock.calls.every((c) => c[1] === 'GET')).toBe(true);
});
