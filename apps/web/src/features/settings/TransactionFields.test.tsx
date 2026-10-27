// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { companyProfileSchema } from '@inventory/contracts';
import { TransactionFields } from './TransactionFields';
afterEach(cleanup);
it('labels tax defaults and preserves explicit zero tax and unconfigured currency', () => {
  const onChange = vi.fn();
  render(<TransactionFields profile={companyProfileSchema.parse({})} onChange={onChange} />);
  const field = screen.getByLabelText('Default tax rate (basis points; 100 = 1%)');
  fireEvent.change(field, { target: { value: '0' } });
  expect(onChange.mock.calls[0]![0]).toMatchObject({
    taxBasisPoints: 0,
    transactionCurrency: null,
  });
  expect(screen.getByRole('combobox', { name: 'Default transaction currency' })).toBeTruthy();
  expect(screen.getByRole('combobox', { name: 'Tax treatment' })).toBeTruthy();
});
