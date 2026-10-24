// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Input, Textarea, Checkbox } from './FormControls';
import { CommandForm } from '../common/CommandForm';

afterEach(cleanup);
it('keeps the action name while loading, suppresses duplicate activation, and restores the handler', async () => {
  const activate = vi.fn();
  const view = render(
    <Button loading onClick={activate}>
      Save changes
    </Button>,
  );
  const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Save changes' });
  expect(button.disabled).toBe(true);
  expect(button.getAttribute('aria-busy')).toBe('true');
  fireEvent.click(button);
  expect(activate).not.toHaveBeenCalled();
  view.rerender(<Button onClick={activate}>Save changes</Button>);
  await userEvent.click(button);
  expect(activate).toHaveBeenCalledTimes(1);
  expect(button.type).toBe('button');
});
it('preserves Slot child links and native read-only, disabled, checkbox and textarea form values', () => {
  render(
    <form aria-label="Native semantics">
      <Button asChild variant="link">
        <a href="#example">Example link</a>
      </Button>
      <Input aria-label="Reference" name="reference" value="REF" readOnly />
      <Input aria-label="Unavailable" name="unavailable" defaultValue="ignored" disabled />
      <Textarea aria-label="Notes" name="notes" defaultValue={'First\nSecond'} maxLength={2000} />
      <Checkbox aria-label="Selected permission" name="permission" value="read" defaultChecked />
    </form>,
  );
  expect(screen.getByRole('link', { name: 'Example link' }).getAttribute('href')).toBe('#example');
  const data = new FormData(screen.getByRole<HTMLFormElement>('form'));
  expect(Object.fromEntries(data)).toEqual({
    reference: 'REF',
    notes: 'First\nSecond',
    permission: 'read',
  });
});
it('keeps command field names, required defaults, limits and submission coercion', async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  render(
    <CommandForm
      inline
      definition={{
        title: 'Local command',
        submit,
        fields: [
          { name: 'qty', label: 'Quantity', kind: 'number', value: 2 },
          { name: 'enabled', label: 'Enabled', kind: 'boolean', value: false },
          { name: 'notes', label: 'Notes', kind: 'multiline', required: false, value: 'Draft' },
        ],
      }}
      run={(work) => {
        void work();
      }}
    />,
  );
  expect(screen.getByLabelText<HTMLInputElement>('Quantity').required).toBe(true);
  expect(screen.getByLabelText<HTMLTextAreaElement>('Notes').maxLength).toBe(2500);
  expect(screen.getByLabelText<HTMLTextAreaElement>('Notes').required).toBe(false);
  await selectOption(screen.getByLabelText('Enabled'), 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Local command' }));
  expect(submit).toHaveBeenCalledExactlyOnceWith({ qty: 2, enabled: true, notes: 'Draft' });
});
