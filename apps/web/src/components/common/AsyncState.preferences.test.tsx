// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultPreferences } from '@inventory/contracts';
import { settingsModel } from '@/platform/settings';
import { AppearanceProvider } from '@/theme/Appearance';
import { EmptyState, ErrorState, LoadingState } from './AsyncState';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
for (const states of ['simple', 'enhanced'] as const) {
  it(`uses ${states} feedback without changing messages or retry behavior`, async () => {
    const initial = settingsModel.snapshot();
    vi.spyOn(settingsModel, 'snapshot').mockReturnValue({
      ...initial,
      accountId: 'presentation-test',
      snapshot: {
        preferences: { version: 1, values: { ...defaultPreferences, states, motion: 'disabled' } },
        platform: { version: 0, values: { defaults: {}, enforced: {}, notifications: {} } },
        canManagePlatform: false,
        connectivity: {
          online: true,
          offlineCash: 'bounded-grant',
          localNetwork: 'deployment-required',
        },
      },
    });
    const retry = vi.fn();
    const create = vi.fn();
    const save = vi.spyOn(settingsModel, 'save');
    render(
      <AppearanceProvider>
        <LoadingState message="Loading records…" />
        <EmptyState
          message="No records."
          description="Create your first record to get started."
          action={{ label: 'Add record', onClick: create }}
        />
        <EmptyState message="No security events." announce />
        <ErrorState message="Unable to load records." onRetry={retry} />
      </AppearanceProvider>,
    );
    const loading = screen
      .getAllByRole('status')
      .find(
        (node) =>
          node.textContent === 'Loading records…' ||
          node.getAttribute('aria-label') === 'Loading records…',
      );
    expect(loading).toBeDefined();
    expect(screen.getByText('No records.').getAttribute('role')).toBeNull();
    expect(screen.getByText('No security events.').getAttribute('role')).toBe('status');
    expect(Boolean(screen.getByText('No records.').closest('.feedback-state'))).toBe(
      states === 'enhanced',
    );
    expect(screen.getByRole('alert').textContent).toBe('Unable to load records.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    if (states === 'enhanced') {
      expect(screen.getByText('Create your first record to get started.')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Unable to load this view' })).toBeTruthy();
      await userEvent.click(screen.getByRole('button', { name: 'Add record' }));
      expect(create).toHaveBeenCalledOnce();
    } else {
      expect(screen.queryByRole('button', { name: 'Add record' })).toBeNull();
    }
    expect(save).not.toHaveBeenCalled();
  });
}
