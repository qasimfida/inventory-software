// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
const request = vi.hoisted(() => vi.fn());
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { ReportsPanel } from './ReportsPanel';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('defers native reports until opened and provides an accessible empty summary', async () => {
  request.mockResolvedValue({
    section: 'sales',
    from: '2026-10-01',
    to: '2026-10-20',
    asOf: '2026-10-20T12:00:00.000Z',
    offset: 0,
    hasMore: false,
    notes: [],
    rows: [],
  });
  render(
    <ReportsPanel
      business={{
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Test',
        role: 'owner',
        state: 'active',
        version: 1,
      }}
      locations={[]}
    />,
  );
  expect(request).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Reports and dashboard' }));
  expect(await screen.findByText('No matching records for this report.')).toBeTruthy();
  expect(screen.getByLabelText('From (UTC)')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
});
