// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandForm } from './CommandForm';
afterEach(cleanup);
it('preserves decimal quantity text instead of coercing it to floating point', async () => {
  const submit = vi.fn().mockResolvedValue({});
  render(
    <CommandForm
      inline
      definition={{
        title: 'Post movement',
        fields: [{ name: 'quantity', label: 'Movement quantity', value: '1' }],
        submit,
      }}
      run={(work) => void work()}
    />,
  );
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Movement quantity'));
  await user.type(screen.getByLabelText('Movement quantity'), '0.1');
  await user.click(screen.getByRole('button', { name: 'Post movement' }));
  await waitFor(() => expect(submit).toHaveBeenCalledWith({ quantity: '0.1' }));
});
