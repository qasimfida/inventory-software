// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { FormDemo } from './FormDemo';
import { ReferencePanel } from './ReferencePanel';
import { FoundationPage } from './FoundationPage';
import { StateDemo } from './StateDemo';
import { Button } from '@/components/ui/Button';

afterEach(cleanup);

it('associates labels, hints and validation errors and focuses the error summary', async () => {
  const user = userEvent.setup();
  render(<FormDemo />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: /Preview label/ });
  expect(input.getAttribute('aria-describedby')).toBe('preview-label-hint');
  await user.click(screen.getByRole('button', { name: 'Update preview' }));
  expect(document.activeElement).toBe(screen.getByRole('alert'));
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toContain('preview-label-error');
  await user.click(screen.getByRole('button', { name: 'Enter a preview label.' }));
  expect(document.activeElement).toBe(input);
  await user.type(input, 'Example');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Spacing preference' }), 'Compact');
  await user.click(screen.getByRole('button', { name: 'Update preview' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Example, compact');
});

it('starts confirmation on Cancel, traps focus, restores the trigger, and resets only on confirmation', async () => {
  const user = userEvent.setup();
  render(<FormDemo />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: /Preview label/ });
  await user.type(input, 'Keep this');
  const trigger = screen.getByRole('button', { name: 'Reset example' });
  await user.click(trigger);
  const dialog = screen.getByRole('alertdialog', { name: 'Reset this example?' });
  const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
  expect(document.activeElement).toBe(cancel);
  await user.tab();
  expect(document.activeElement).toBe(
    within(dialog).getByRole('button', { name: 'Reset example' }),
  );
  await user.tab();
  expect(document.activeElement).toBe(cancel);
  await user.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(input.value).toBe('Keep this');
  await user.click(trigger);
  await user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Reset example' }),
  );
  expect(input.value).toBe('');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('supports keyboard menu navigation and skips disabled items', async () => {
  const user = userEvent.setup();
  render(<ReferencePanel />);
  const trigger = screen.getByRole('button', { name: /Example actions/ });
  trigger.focus();
  await user.keyboard('{Enter}');
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Show feedback' })),
  );
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Clear feedback' }));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('retries the example error through a keyboard-operable action', async () => {
  const user = userEvent.setup();
  render(<StateDemo />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Example state' }), 'error');
  expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
  const retry = screen.getByRole('button', { name: 'Try again' });
  retry.focus();
  await user.keyboard('{Enter}');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('There is nothing to display in this example yet.')).toBeTruthy();
});

it('defaults ordinary buttons to non-submit and preserves explicit submit buttons', () => {
  render(
    <>
      <Button>Ordinary</Button>
      <Button type="submit">Submit</Button>
      <Button disabled>Disabled</Button>
    </>,
  );
  expect(screen.getByRole('button', { name: 'Ordinary' }).getAttribute('type')).toBe('button');
  expect(screen.getByRole('button', { name: 'Submit' }).getAttribute('type')).toBe('submit');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Disabled' }).disabled).toBe(true);
});

it('has no detectable semantic accessibility violations, including an open confirmation', async () => {
  const user = userEvent.setup();
  const { container } = render(<FoundationPage />);
  // jsdom has no layout/canvas; actual color contrast is checked in a real browser.
  const options = { rules: { 'color-contrast': { enabled: false } } };
  expect((await axe.run(container, options)).violations).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'Reset example' }));
  expect((await axe.run(document.body, options)).violations).toEqual([]);
});
