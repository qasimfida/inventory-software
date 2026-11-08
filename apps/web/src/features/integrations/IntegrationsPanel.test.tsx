// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from '@testing-library/react';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { IntegrationsPanel } from './IntegrationsPanel';
const business = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test',
  role: 'owner' as const,
  state: 'active' as const,
  version: 1,
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('keeps navigation usable while AI is unconfigured and never submits a provider call', async () => {
  request.mockResolvedValue({
    services: [{ id: 'ai', state: 'unconfigured', detail: 'No adapter installed.' }],
    navigation: ['Inventory and warehouse operations'],
  });
  render(<IntegrationsPanel business={business} />);
  expect(await screen.findByText('Inventory and warehouse operations')).toBeTruthy();
  expect(screen.queryByLabelText('Navigation question')).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
});
it('shows a safe retry state without exposing transport details', async () => {
  request.mockRejectedValue(new Error('secret transport metadata'));
  render(<IntegrationsPanel business={business} />);
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Unable to load data. Reconnect and retry.',
  );
  expect(screen.getByRole('button', { name: 'Refresh integration status' })).toBeTruthy();
});
it('distinguishes local services from an enabled provider and preserves server setup details', async () => {
  request.mockResolvedValue({
    services: [
      { id: 'payments', state: 'local', detail: 'Cash only.' },
      { id: 'notifications', state: 'local', detail: 'In-app only.' },
      { id: 'ai', state: 'unconfigured', detail: 'No adapter installed.' },
    ],
    navigation: [],
  });
  render(<IntegrationsPanel business={business} />);
  expect(await screen.findByText('Payments')).toBeTruthy();
  expect(screen.getAllByText('Built-in only')).toHaveLength(2);
  expect(screen.getByText('Not configured')).toBeTruthy();
  expect(screen.queryByText('Enabled')).toBeNull();
  expect(screen.getByText('Cash only.')).toBeTruthy();
  expect(screen.getByText('No navigation guidance available')).toBeTruthy();
});
it('recovers a failed status read and explains missing service status without claiming activation', async () => {
  request
    .mockRejectedValueOnce(new Error('secret'))
    .mockResolvedValue({ services: [], navigation: [] });
  render(<IntegrationsPanel business={business} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No provider status returned')).toBeTruthy();
  expect(screen.queryByText('Enabled')).toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
});
it('only submits an explicit navigation question when enabled and renders explanation as text', async () => {
  const status = {
    services: [{ id: 'ai', state: 'enabled', detail: 'Navigation help only.' }],
    navigation: ['Inventory'],
  };
  request.mockImplementation((path: string, method?: string) =>
    Promise.resolve(
      method === 'POST' && path.endsWith('/assistant')
        ? { explanation: 'Open Inventory. <script>not executable</script>' }
        : status,
    ),
  );
  render(<IntegrationsPanel business={business} />);
  const input = await screen.findByLabelText('Navigation question');
  const ask = screen.getByRole('button', { name: 'Ask navigation assistant' });
  expect(request).toHaveBeenCalledTimes(1);
  await userEvent.type(input, 'Where is inventory?');
  await userEvent.click(ask);
  expect(await screen.findByText('Open Inventory. <script>not executable</script>')).toBeTruthy();
  expect(request.mock.calls.filter((call) => call[1] === 'POST')).toEqual([
    [`/${business.id}/integrations/assistant`, 'POST', { question: 'Where is inventory?' }],
  ]);
});
