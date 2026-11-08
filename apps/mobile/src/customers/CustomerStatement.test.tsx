// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { customerSchema, customerStatementSchema } from '@inventory/contracts';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../packages/api-client/src/mock/read-commerce';
import { CustomerStatement } from './CustomerStatement';
import { CustomerProfile } from './CustomerProfile';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
afterEach(cleanup);
const seed = createDemoSeed(0, 'owner');
const customer = customerSchema.parse(seed.customers[0]);
it('shows contact and credit policy without exposing mutation controls', () => {
  render(
    <CustomerProfile
      customer={{ ...customer, creditHold: true, creditLimitMinor: '9007199254740993' }}
      store="Central store"
    />,
  );
  for (const value of [
    customer.name,
    customer.code,
    'Central store',
    'On hold',
    '$90071992547409.93',
  ])
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button')).toBeNull();
});
it('separates exact payment, credit and refund evidence without converting currencies', () => {
  const statement = customerStatementSchema.parse(
    readCommerce(seed, `customers/${customer.id}/statement`, new URLSearchParams(), false),
  );
  const createdAt = '2026-11-06T12:00:00Z';
  statement.payments = [
    { id: seed.id(991), amountMinor: '9007199254740993', reference: 'Receipt ABC', createdAt },
  ];
  statement.credits = [
    { id: seed.id(992), amountMinor: '12345', sourceId: seed.id(990), createdAt },
  ];
  statement.refunds = [
    { id: seed.id(993), amountMinor: '23456', sourceId: seed.id(990), createdAt },
  ];
  render(
    <CustomerStatement
      statement={statement}
      business={seed.business}
      statementOffset={0}
      setStatementOffset={vi.fn()}
    />,
  );
  for (const value of [
    'Cash payments',
    'Cash refunds',
    'Credits',
    'Receipt ABC',
    '$90071992547409.93',
    '$123.45',
    '$234.56',
  ])
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
});
it('labels missing financial history without inventing a transaction', () => {
  const statement = customerStatementSchema.parse(
    readCommerce(seed, `customers/${customer.id}/statement`, new URLSearchParams(), true),
  );
  render(
    <CustomerStatement
      statement={statement}
      business={seed.business}
      statementOffset={0}
      setStatementOffset={vi.fn()}
    />,
  );
  for (const title of ['receivables', 'cash payments', 'cash refunds', 'credits'])
    expect(screen.getByText(`No ${title} on this page`)).toBeTruthy();
});
