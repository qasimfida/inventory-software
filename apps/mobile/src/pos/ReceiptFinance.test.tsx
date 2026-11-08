// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { ReceiptFinance } from './ReceiptFinance';
import { saleReceiptSchema } from '@inventory/contracts';
afterEach(cleanup);
it('distinguishes outstanding debt, return credit and confirmed cash refunds', () => {
  const seed = createDemoSeed(0, 'owner');
  const receipt = saleReceiptSchema.parse(seed.sales[0]);
  receipt.finance.reconciled = false;
  receipt.finance.outstandingMinor = '12345';
  receipt.finance.returns = [
    {
      id: seed.id(890),
      kind: 'exchange',
      reasonCode: 'incorrect',
      totalMinor: '200',
      creditMinor: '125',
      cashRefundMinor: '75',
      createdAt: receipt.sale.createdAt,
      replacementSaleId: seed.id(891),
    },
  ];
  receipt.finance.refunds = [
    { id: seed.id(892), returnId: seed.id(890), paymentId: seed.id(893), amountMinor: '75' },
  ];
  render(<ReceiptFinance receipt={receipt} timeZone="UTC" />);
  for (const value of ['Review required', '12345', '125', '75', 'exchange', seed.id(891)])
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button')).toBeNull();
});
it('does not invent a return or refund when there is no evidence', () => {
  const receipt = saleReceiptSchema.parse(createDemoSeed(0, 'owner').sales[0]);
  render(<ReceiptFinance receipt={receipt} timeZone="UTC" />);
  expect(screen.getByText('No corrections history')).toBeTruthy();
  expect(screen.getByText('No confirmed refunds')).toBeTruthy();
});
