// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterButton } from './FilterButton';
afterEach(cleanup);
it('shows the applied count and a keyboard-accessible tooltip without changing the trigger', async () => {
  const click = vi.fn();
  const view = render(
    <FilterButton active={['Status: active', 'Category: Office']} onClick={click} />,
  );
  expect(screen.getByLabelText('2 active filters')).toBeTruthy();
  await userEvent.tab();
  expect((await screen.findByRole('tooltip')).textContent).toContain('Category: Office');
  await userEvent.keyboard('{Enter}');
  expect(click).toHaveBeenCalledOnce();
  view.rerender(<FilterButton active={[]} />);
  expect(screen.queryByLabelText('2 active filters')).toBeNull();
});
