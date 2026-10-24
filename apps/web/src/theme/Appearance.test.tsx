// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppearanceControl, AppearanceProvider } from './Appearance';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('follows system changes only in system mode and does not persist a competing setting', async () => {
  const media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  const before = localStorage.length;
  const view = render(
    <AppearanceProvider>
      <AppearanceControl />
    </AppearanceProvider>,
  );
  expect(document.documentElement.dataset.theme).toBe('dark');
  await selectOption(screen.getByRole('combobox', { name: 'Appearance' }), 'light');
  expect(document.documentElement.dataset.theme).toBe('light');
  await selectOption(screen.getByRole('combobox', { name: 'Appearance' }), 'system');
  media.matches = false;
  const listener = media.addEventListener.mock.calls.at(-1)?.[1] as () => void;
  listener();
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.length).toBe(before);
  view.unmount();
  expect(media.removeEventListener).toHaveBeenCalled();
});
