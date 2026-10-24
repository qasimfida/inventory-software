// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { DataRow } from './DataRow';
import { ThemeProvider } from '../theme';
afterEach(cleanup);
it('keeps exact report strings and units without rounding or line truncation', () => {
  render(
    <ThemeProvider>
      <DataRow label="Gross sales" value="9007199254740993" unit="USD minor units" />
    </ThemeProvider>,
  );
  expect(screen.getByText('Gross sales')).toBeTruthy();
  const value = screen.getByText('9007199254740993 USD minor units');
  expect(getComputedStyle(value).fontVariant).toBe('tabular-nums');
  expect(getComputedStyle(value).textOverflow).not.toBe('ellipsis');
});

it('announces controlled expansion without owning or replacing the caller state', async () => {
  const { DisclosureTrigger } = await import('./DisclosureTrigger');
  const { fireEvent } = await import('@testing-library/react');
  const toggle = vi.fn();
  const view = render(
    <ThemeProvider>
      <DisclosureTrigger label="Details" expanded={false} onPress={toggle} />
    </ThemeProvider>,
  );
  const button = screen.getByRole('button', { name: 'Details' });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(button);
  expect(toggle).toHaveBeenCalledTimes(1);
  expect(button.getAttribute('aria-expanded')).toBe('false');
  view.rerender(
    <ThemeProvider>
      <DisclosureTrigger label="Details" expanded onPress={toggle} />
    </ThemeProvider>,
  );
  expect(button.getAttribute('aria-expanded')).toBe('true');
});
