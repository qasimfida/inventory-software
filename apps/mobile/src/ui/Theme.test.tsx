// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { ThemeProvider, useTheme } from '../theme';
import { AppearanceControl } from './AppearanceControl';
import { Text } from './Themed';
import { Action, Field } from './Controls';
import { ConfirmAction } from './ConfirmAction';
function Example() {
  const theme = useTheme();
  return (
    <>
      <Text>{theme.mode}</Text>
      <AppearanceControl />
      <Action
        label="Unavailable"
        disabled
        onPress={() => {
          throw new Error('must not activate');
        }}
      />
      <Field label="Example field" value="Draft" onChange={() => {}} />
    </>
  );
}
afterEach(cleanup);
it('keeps native body readable and derives heading line height from its font size', () => {
  render(
    <ThemeProvider>
      <Text>Native body</Text>
      <Text style={{ fontSize: 28 }}>Native title</Text>
      <Text style={{ fontSize: 20, lineHeight: 32 }}>Explicit line height</Text>
    </ThemeProvider>,
  );
  expect(getComputedStyle(screen.getByText('Native body')).fontSize).toBe('16px');
  expect(getComputedStyle(screen.getByText('Native title')).lineHeight).toBe('42px');
  expect(getComputedStyle(screen.getByText('Explicit line height')).lineHeight).toBe('32px');
});
it('switches native semantic colors without remounting controls and exposes selection/disabled states', async () => {
  render(
    <ThemeProvider>
      <Example />
    </ThemeProvider>,
  );
  const field = screen.getByLabelText('Example field');
  const originalColor = getComputedStyle(field).color;
  await userEvent.click(screen.getByRole('radio', { name: 'Appearance: dark' }));
  expect(screen.getByRole('radio', { name: 'Appearance: dark' }).getAttribute('aria-checked')).toBe(
    'true',
  );
  expect(screen.getByLabelText('Example field')).toBe(field);
  expect(getComputedStyle(field).color).not.toBe(originalColor);
  fireEvent.click(screen.getByRole('button', { name: 'Unavailable' }));
  expect(screen.getByRole('button', { name: 'Unavailable' }).getAttribute('aria-disabled')).toBe(
    'true',
  );
  await userEvent.click(screen.getByRole('radio', { name: 'Appearance: light' }));
  expect(
    screen.getByRole('radio', { name: 'Appearance: light' }).getAttribute('aria-checked'),
  ).toBe('true');
});

it('native confirmation cancels without a mutation and invokes only explicit confirmation', async () => {
  const confirm = vi.fn();
  render(
    <ThemeProvider>
      <ConfirmAction
        label="Archive example"
        confirmLabel="Confirm archive"
        description="Permanent example action."
        onConfirm={confirm}
      />
    </ThemeProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Archive example' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(confirm).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Archive example' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
