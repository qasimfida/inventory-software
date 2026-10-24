// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StaffDetails } from './StaffDetails';
afterEach(cleanup);
it('opens staff information before editing and links to the actual account permission editor', async () => {
  const user = userEvent.setup(),
    submit = vi.fn();
  render(
    <MemoryRouter>
      <StaffDetails
        staff={{
          id: 'staff-1',
          name: 'Alex Morgan',
          code: 'EMP-1',
          title: 'Cashier',
          storeId: null,
          salaryMinor: '120000',
          currency: 'USD',
          state: 'active',
          version: 2,
        }}
        locations={[]}
        definition={{ title: 'Edit staff', fields: [], submit }}
        run={(work) => {
          void work();
        }}
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('dialog').textContent).toContain('Alex Morgan');
  for (const detail of ['EMP-1', 'Cashier', 'Business-wide', 'USD', 'active', 'staff-1'])
    expect(screen.getByRole('dialog').textContent).toContain(detail);
  expect(
    screen.getByRole('link', { name: 'Manage permissions and access' }).getAttribute('href'),
  ).toBe('/team');
  expect(screen.queryByRole('form')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit staff details' }));
  expect(screen.getByRole('form', { name: 'Edit staff' })).toBeTruthy();
  expect(submit).not.toHaveBeenCalled();
});
