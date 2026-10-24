// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { NativeShowcase } from './NativeShowcase';
import { settingsModel } from '../settings/model';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('keeps native appearance and confirmation examples local for a signed-in account', async () => {
  vi.spyOn(settingsModel, 'snapshot').mockReturnValue({
    ...settingsModel.snapshot(),
    accountId: 'example-account',
  });
  const save = vi.spyOn(settingsModel, 'save');
  const fetch = vi.spyOn(globalThis, 'fetch');
  const { container } = render(<NativeShowcase />);
  const surface = container.firstElementChild;
  if (!(surface instanceof HTMLElement)) throw new Error('Missing preview surface');
  const originalBackground = getComputedStyle(surface).backgroundColor;
  await userEvent.click(screen.getByRole('button', { name: 'Components / Design system' }));
  await userEvent.click(screen.getByRole('radio', { name: 'Appearance: dark' }));
  expect(screen.getByRole('radio', { name: 'Appearance: dark' }).getAttribute('aria-checked')).toBe(
    'true',
  );
  expect(getComputedStyle(surface).backgroundColor).not.toBe(originalBackground);
  await userEvent.click(screen.getByRole('button', { name: 'Confirm local example' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm example' }));
  expect(screen.getByLabelText('Native example field').getAttribute('value')).toBe(
    'Confirmed example',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Preview native command' }));
  expect(screen.getByText('Local preview: 1.250000')).toBeTruthy();
  expect(screen.getAllByText('1234.567890')[0]).toBeTruthy();
  expect(screen.getAllByText('9007199254740993').length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: 'Native component examples' })).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
