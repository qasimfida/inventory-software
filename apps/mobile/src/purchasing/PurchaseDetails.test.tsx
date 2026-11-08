// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { purchaseDetailSchema } from '@inventory/contracts';
import { PurchaseDetails } from './PurchaseDetails';
afterEach(cleanup);
it('shows exact order, receipt and invoice evidence without merging receiving and payments', () => {
  const seed = createDemoSeed(0, 'owner');
  const detail = purchaseDetailSchema.parse(seed.purchases[0]);
  render(<PurchaseDetails detail={detail} timeZone="UTC" />);
  expect(screen.getAllByText('Order lines').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Delivery receipts').length).toBeGreaterThan(0);
  expect(screen.getAllByText(detail.order.reference).length).toBeGreaterThan(0);
  expect(screen.getAllByText(detail.lines[0]!.quantity).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button')).toBeNull();
});
it('names empty histories explicitly', () => {
  const seed = createDemoSeed(0, 'owner');
  const detail = purchaseDetailSchema.parse(seed.purchases[0]);
  render(<PurchaseDetails detail={{ ...detail, receipts: [], returns: [], invoices: [] }} />);
  expect(screen.getByText('No delivery receipts')).toBeTruthy();
  expect(screen.getByText('No supplier returns')).toBeTruthy();
  expect(screen.getByText('No supplier invoices')).toBeTruthy();
});
