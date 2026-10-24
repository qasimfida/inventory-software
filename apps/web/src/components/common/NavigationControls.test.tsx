// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandForm } from './CommandForm';
import { RecordCollection } from './RecordCollection';
import { AccordionSection } from '../ui/Accordion';
afterEach(cleanup);
it('opens the actual command form in a sheet and preserves its submitted fields', async () => {
  const submit = vi.fn().mockResolvedValue({});
  render(
    <CommandForm
      definition={{
        title: 'Create example',
        fields: [{ name: 'name', label: 'Name', value: '' }],
        submit,
      }}
      run={(work) => {
        void work();
      }}
    />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  const trigger = screen.getByRole('button', { name: 'Create example' });
  await userEvent.click(trigger);
  expect(screen.getByRole('dialog')).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Name'), 'Example');
  await userEvent.click(screen.getByRole('button', { name: 'Create example' }));
  expect(submit).toHaveBeenCalledWith({ name: 'Example' });
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it('omits inert selection and opens the same record from list and grid', async () => {
  const onOpen = vi.fn();
  render(
    <RecordCollection
      label="customers"
      toolbar={<input aria-label="Collection search" />}
      items={[
        {
          id: 'one',
          title: 'Alice',
          subtitle: 'A1',
          detail: 'USD',
          status: 'active',
          tone: 'success',
        },
      ]}
      onOpen={onOpen}
    />,
  );
  expect(screen.queryByRole('checkbox')).toBeNull();
  await userEvent.type(screen.getByLabelText('Collection search'), 'Al');
  await userEvent.click(screen.getByRole('tab', { name: 'customers grid view' }));
  expect(screen.getByLabelText<HTMLInputElement>('Collection search').value).toBe('Al');
  expect(screen.queryByRole('checkbox')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Alice' }));
  expect(onOpen).toHaveBeenCalledWith('one');
});
it('keeps a local draft mounted when an accordion closes', async () => {
  render(
    <AccordionSection title="Details">
      <input aria-label="Draft" defaultValue="" />
    </AccordionSection>,
  );
  const toggle = screen.getByRole('button', { name: 'Details' });
  await userEvent.click(toggle);
  await userEvent.type(screen.getByLabelText('Draft'), 'Saved draft');
  await userEvent.click(toggle);
  await userEvent.click(toggle);
  expect(screen.getByLabelText<HTMLInputElement>('Draft').value).toBe('Saved draft');
});
