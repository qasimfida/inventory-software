// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
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
