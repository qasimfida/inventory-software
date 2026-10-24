// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
import { ConfirmAction } from './ConfirmAction';
import { Text } from './Themed';
afterEach(cleanup);

it('focuses cancellation, restores the trigger and never confirms dismissal', async () => {
  const confirm = vi.fn();
  render(
    <ConfirmAction
      label="Review local example"
      description="Local test only."
      confirmLabel="Confirm local change"
      onConfirm={confirm}
    />,
  );
  const trigger = screen.getByRole('button', { name: 'Review local example' });
  await userEvent.click(trigger);
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(confirm).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm local change' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
it('announces important errors while preserving explicit announcement choices', () => {
  render(
    <>
      <Text accessibilityRole="alert">Connection failed.</Text>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
        Retry pending.
      </Text>
      <Text>Saved draft details</Text>
    </>,
  );
  expect(screen.getByText('Connection failed.').getAttribute('aria-live')).toBe('assertive');
  expect(screen.getByText('Retry pending.').getAttribute('aria-live')).toBe('polite');
  expect(screen.getByText('Saved draft details').getAttribute('aria-live')).toBeNull();
});
