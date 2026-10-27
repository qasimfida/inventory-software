// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { companyProfileSchema } from '@inventory/contracts';
import { TransactionFields } from './TransactionFields';
afterEach(cleanup);
it('native fields preserve zero tax and respect the disabled state', () => {
  const onChange = vi.fn();
  const props = { profile: companyProfileSchema.parse({}), onChange, disabled: false };
  const view = render(<TransactionFields {...props} />);
  fireEvent.change(screen.getByLabelText('Default tax rate (basis points; 100 = 1%)'), {
    target: { value: '0' },
  });
  expect(onChange.mock.calls[0]![0]).toMatchObject({
    taxBasisPoints: 0,
    transactionCurrency: null,
  });
  view.rerender(<TransactionFields {...props} disabled />);
  expect(
    screen.getByLabelText('Default tax rate (basis points; 100 = 1%)').getAttribute('readOnly'),
  ).not.toBeNull();
});
