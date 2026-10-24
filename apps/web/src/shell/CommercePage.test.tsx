// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Location } from '@inventory/contracts';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
const workspace = vi.hoisted(() => ({
  current: {} as { business?: unknown; locations: Location[] },
}));
vi.mock('./WorkspaceContext', () => ({ useWorkspace: () => workspace.current }));
vi.mock('@/features/pos/CashPanel', () => ({
  CashPanel: ({ warehouseId }: { warehouseId: string }) => <p>Cash warehouse {warehouseId}</p>,
}));
vi.mock('@/features/pos/ReceiptPanel', () => ({
  ReceiptPanel: ({ warehouseId }: { warehouseId: string }) => (
    <p>Receipt warehouse {warehouseId}</p>
  ),
}));
import { CommercePage } from './CommercePage';
afterEach(cleanup);
it.each([true, false])('recovers when authorized warehouses load or change, cash=%s', (cash) => {
  const seed = createDemoSeed(0, 'owner');
  const warehouses = seed.locations.filter((l) => l.kind === 'warehouses');
  workspace.current = { business: seed.business, locations: [] };
  const view = render(<CommercePage cash={cash} />);
  expect(screen.getByText('Add a warehouse in Settings to begin.')).toBeTruthy();
  workspace.current = { business: seed.business, locations: warehouses };
  view.rerender(<CommercePage cash={cash} />);
  expect(
    screen.getByText(`${cash ? 'Cash' : 'Receipt'} warehouse ${warehouses[0]!.id}`),
  ).toBeTruthy();
  workspace.current.locations = warehouses.map((w, i) =>
    i === 0 ? { ...w, state: 'archived' } : w,
  );
  view.rerender(<CommercePage cash={cash} />);
  expect(
    screen.queryByText(`${cash ? 'Cash' : 'Receipt'} warehouse ${warehouses[0]!.id}`),
  ).toBeNull();
  workspace.current.locations = [];
  view.rerender(<CommercePage cash={cash} />);
  expect(screen.getByText('Add a warehouse in Settings to begin.')).toBeTruthy();
});
