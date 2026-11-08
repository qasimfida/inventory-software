// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { payableDetailSchema, businessTime } from '@inventory/contracts';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { PayableDetails } from './PayableDetails';

afterEach(cleanup);
const seed = createDemoSeed(0, 'owner');
it('shows exact negative balances, readable event labels and scoped invoice context', () => {
  const detail = payableDetailSchema.parse(seed.payables[0]);
  detail.invoice.outstandingMinor = '-9007199254740993';
  detail.events = [
    {
      id: seed.id(991),
      kind: 'refund',
      amountMinor: '12345678901234567890',
      reference: 'Supplier receipt',
      reason: '',
      actorId: seed.id(992),
      createdAt: '2026-11-06T12:00:00Z',
      returnId: null,
      shiftId: null,
    },
  ];
  render(<PayableDetails detail={detail} warehouse="Central warehouse" timeZone="Asia/Karachi" />);
  for (const value of [
    '$-90071992547409.93',
    '$123456789012345678.90',
    'Cash refund received',
    'Central warehouse',
    detail.invoice.supplierName,
    businessTime(detail.events[0]!.createdAt, 'Asia/Karachi'),
  ])
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  expect(screen.queryByText('Shift null')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});
it('does not imply credits or settlements exist when no history is returned', () => {
  const detail = payableDetailSchema.parse(seed.payables[0]);
  detail.returns = [];
  detail.events = [];
  render(<PayableDetails detail={detail} warehouse="Central warehouse" timeZone="UTC" />);
  expect(screen.getByText('No uncredited returns in this response')).toBeTruthy();
  expect(screen.getByText('No settlement or credit events')).toBeTruthy();
});
