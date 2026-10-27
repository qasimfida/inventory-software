// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { stockWorkspaceSchema } from '@inventory/contracts';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readInventory } from '../../../../packages/api-client/src/mock/read-inventory';
import { readStockPlanning } from '../../../../packages/api-client/src/mock/read-stock-planning';
import { StockPlanning } from './StockPlanning';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('native stock planning loads on demand and keeps read-only users out of mutations', async () => {
  const s = createDemoSeed(0, 'owner'),
    q = new URLSearchParams({ warehouseId: s.id(3) });
  request.mockResolvedValue(readStockPlanning(s, q, false));
  render(
    <StockPlanning
      business={{ ...s.business, role: 'custom', permissions: ['stock.read'] }}
      warehouseId={s.id(3)}
      stock={stockWorkspaceSchema.parse(readInventory(s, 'stock', q, false))}
      onChanged={() => {}}
    />,
  );
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reorder policies and order holds' }));
  await screen.findByText(/DEMO-ORDER-001/);
  expect(screen.queryByRole('button', { name: 'Create order stock hold' })).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[1]).toBeUndefined();
});
