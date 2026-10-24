// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Location } from '@inventory/contracts';
vi.mock('./PosCheckout', () => ({
  PosCheckout: ({ warehouse }: { warehouse: Location }) => <div>Products for {warehouse.id}</div>,
}));
vi.mock('./CashPanel', () => ({ CashPanel: () => null }));
vi.mock('./ReceiptPanel', () => ({ ReceiptPanel: () => null }));
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { PosPanel } from './PosPanel';
afterEach(cleanup);
it('loads checkout when warehouses arrive after mount and recovers after a scope change', () => {
  const seed = createDemoSeed(0, 'owner');
  const warehouse = seed.locations.find((l) => l.kind === 'warehouses')!;
  const props = { business: seed.business, close: () => undefined };
  const view = render(<PosPanel {...props} locations={[]} />);
  expect(screen.queryByText(`Products for ${warehouse.id}`)).toBeNull();
  view.rerender(<PosPanel {...props} locations={[warehouse]} />);
  expect(screen.getByText(`Products for ${warehouse.id}`)).toBeTruthy();
  const next = { ...warehouse, id: 'other-authorized-warehouse' };
  view.rerender(<PosPanel {...props} locations={[next]} />);
  expect(screen.getByText(`Products for ${next.id}`)).toBeTruthy();
  view.rerender(<PosPanel {...props} locations={[]} />);
  expect(screen.queryByText(`Products for ${next.id}`)).toBeNull();
});
