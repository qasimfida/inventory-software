// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FoundationPage } from './FoundationPage';
import { settingsModel } from '@/platform/settings';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('isolates showcase appearance from a signed-in account and restores the surrounding theme', async () => {
  const state = { ...settingsModel.snapshot(), accountId: 'example-account' };
  vi.spyOn(settingsModel, 'snapshot').mockReturnValue(state);
  const save = vi.spyOn(settingsModel, 'save');
  const fetch = vi.spyOn(globalThis, 'fetch');
  document.documentElement.dataset.theme = 'light';
  const { unmount } = render(<FoundationPage />);
  await selectOption(screen.getByRole('combobox', { name: 'Appearance' }), 'dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  await selectOption(screen.getByLabelText('Example state'), 'offline');
  expect(screen.getByText(/No server confirmation/)).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  unmount();
  expect(document.documentElement.dataset.theme).toBe('light');
});
