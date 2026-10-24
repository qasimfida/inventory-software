// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { ThemeProvider } from '../theme';
import { Action, Choice, Field } from './Controls';
import { TextInput } from './Themed';
afterEach(cleanup);
it('exposes native loading without losing the label or dispatching a second action', async () => {
  const press = vi.fn();
  const view = render(
    <ThemeProvider>
      <Action label="Save example" loading onPress={press} />
    </ThemeProvider>,
  );
  const button = screen.getByRole('button', { name: 'Save example' });
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(button.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(button);
  expect(press).not.toHaveBeenCalled();
  view.rerender(
    <ThemeProvider>
      <Action label="Save example" onPress={press} />
    </ThemeProvider>,
  );
  await userEvent.click(button);
  expect(press).toHaveBeenCalledTimes(1);
});
it('preserves field handlers, read-only values and associated validation hints', async () => {
  const focus = vi.fn();
  const blur = vi.fn();
  const change = vi.fn();
  render(
    <ThemeProvider>
      <TextInput
        accessibilityLabel="Editable"
        onFocus={focus}
        onBlur={blur}
        onChangeText={change}
      />
      <Field label="Reference" value="REF" onChange={change} readOnly error="Review reference" />
    </ThemeProvider>,
  );
  await userEvent.type(screen.getByLabelText('Editable'), 'A');
  await userEvent.tab();
  expect(focus).toHaveBeenCalledTimes(1);
  expect(blur).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith('A');
  expect(screen.getByLabelText<HTMLInputElement>('Reference').readOnly).toBe(true);
  const descriptionId = screen.getByLabelText('Reference').getAttribute('aria-describedby');
  expect(document.getElementById(descriptionId!)?.textContent).toBe('Review reference');
});
it('disabled choices cannot change values; selected and disabled states remain separate', async () => {
  const change = vi.fn();
  render(
    <ThemeProvider>
      <Choice
        label="Choice"
        value="first"
        onChange={change}
        options={[
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second', disabled: true },
        ]}
      />
    </ThemeProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Choice' }));
  expect(screen.getByRole('radio', { name: 'Choice: First' }).getAttribute('aria-checked')).toBe(
    'true',
  );
  fireEvent.click(screen.getByRole('radio', { name: 'Choice: Second' }));
  expect(change).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('radio', { name: 'Choice: First' }));
  expect(change).toHaveBeenCalledExactlyOnceWith('first');
});
