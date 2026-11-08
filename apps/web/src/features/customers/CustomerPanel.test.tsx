// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../../packages/api-client/src/mock/read-commerce';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { CustomerPanel } from './CustomerPanel';
const seed = createDemoSeed(0, 'owner');
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('opens loaded customer details for a viewer without write or credit actions', async () => {
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    return readCommerce(seed, url.pathname.split('/').slice(2).join('/'), url.searchParams, false);
  });
  render(
    <CustomerPanel business={{ ...seed.business, role: 'viewer' }} locations={seed.locations} />,
  );
  await userEvent.click(await screen.findByRole('button', { name: seed.customers[0]!.name }));
  await screen.findByLabelText('Credit policy');
  for (const name of [
    'Add customer',
    'Archive customer',
    'Save credit policy',
    'Record customer cash payment',
    'Publish customer price',
  ])
    expect(screen.queryByRole('button', { name })).toBeNull();
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
it('offers a read-only retry after a failed collection request', async () => {
  request.mockRejectedValue(new Error('Connection unavailable'));
  render(<CustomerPanel business={seed.business} locations={seed.locations} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(request.mock.calls.length).toBeGreaterThan(1);
  expect(request.mock.calls.every((call) => call[1] === 'GET')).toBe(true);
});

it('keeps creation/export in the header and clears optional filters without losing store scope', async () => {
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    return readCommerce(seed, url.pathname.split('/').slice(2).join('/'), url.searchParams, false);
  });
  render(<CustomerPanel business={seed.business} locations={seed.locations} />);
  await screen.findByRole('button', { name: seed.customers[0]!.name });
  await userEvent.type(
    screen.getByRole('combobox', { name: 'Search customers / email / phone' }),
    'no-match',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(
    screen
      .getByRole('combobox', { name: 'Search customers / email / phone' })
      .getAttribute('value'),
  ).toBe('');
  expect(screen.getByRole('button', { name: 'Add customer' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add customer' }).closest('header')).toBeTruthy();
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
