// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';
import { Button } from './Button';
afterEach(cleanup);
it('uses real form values, keyboard selection, disabled options and restores focus', async () => {
  const change = vi.fn();
  render(
    <form aria-label="Example">
      <label htmlFor="unit">Unit</label>
      <Select id="unit" name="unit" defaultValue="ea" onChange={change}>
        <option value="ea">Each</option>
        <option value="gone" disabled>
          Unavailable
        </option>
        <option value="box">Box</option>
      </Select>
      <Button type="submit">Save</Button>
    </form>,
  );
  const trigger = screen.getByRole('combobox', { name: 'Unit' });
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard('{End}{Enter}');
  expect(change).toHaveBeenCalledTimes(1);
  expect(new FormData(screen.getByRole<HTMLFormElement>('form')).get('unit')).toBe('box');
  expect(document.activeElement).toBe(trigger);
});
it('keeps native required validation and focuses the visible control', async () => {
  render(
    <form aria-label="Required">
      <label htmlFor="required">Category</label>
      <Select id="required" name="category" required defaultValue="">
        <option value="">Choose category</option>
        <option value="one">Office</option>
      </Select>
    </form>,
  );
  const form = screen.getByRole<HTMLFormElement>('form');
  expect(form.checkValidity()).toBe(false);
  const trigger = screen.getByRole('combobox', { name: 'Category' });
  expect(document.activeElement).toBe(trigger);
  // jsdom validity dispatch is synchronous but React state updates must use its event adapter.
  fireEvent.invalid(form.querySelector('select')!);
  expect(screen.getByRole('alert').textContent).toBeTruthy();
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('option', { name: 'Office' }));
  expect(form.checkValidity()).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
});
it('honors disabled option groups and resets uncontrolled values with the original form', async () => {
  render(
    <form aria-label="Reset example">
      <label htmlFor="reset-unit">Reset unit</label>
      <Select id="reset-unit" name="unit" defaultValue="ea">
        <option value="ea">Each</option>
        <optgroup label="Unavailable" disabled>
          <option value="case">Case</option>
        </optgroup>
        <option value="box">Box</option>
      </Select>
      <button type="reset">Reset form</button>
    </form>,
  );
  const trigger = screen.getByRole('combobox', { name: 'Reset unit' });
  await userEvent.click(trigger);
  expect(screen.getByRole('option', { name: 'Case' }).getAttribute('aria-disabled')).toBe('true');
  await userEvent.click(screen.getByRole('option', { name: 'Box' }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset form' }));
  expect(trigger.textContent).toBe('Each');
  expect(new FormData(screen.getByRole<HTMLFormElement>('form')).get('unit')).toBe('ea');
});

it('omits search for small option sets and offers search for larger collections', async () => {
  const { rerender } = render(
    <Select aria-label="Enabled">
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </Select>,
  );
  await userEvent.click(screen.getByRole('combobox', { name: 'Enabled' }));
  expect(screen.queryByPlaceholderText('Search options…')).toBeNull();
  await userEvent.keyboard('{Escape}');
  rerender(
    <Select aria-label="Warehouse">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <option key={i} value={String(i)}>
          Warehouse {i}
        </option>
      ))}
    </Select>,
  );
  await userEvent.click(screen.getByRole('combobox', { name: 'Warehouse' }));
  expect(screen.getByPlaceholderText('Search options…')).toBeTruthy();
});
