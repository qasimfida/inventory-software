// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PosItem } from '@inventory/api-client';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
const { tick, stop } = vi.hoisted(() => ({ tick: vi.fn(), stop: vi.fn() }));
vi.mock('@inventory/api-client', async (original) => ({
  ...(await original<object>()),
  Invalidations: class {
    tick = tick;
    stop = stop;
  },
}));
vi.mock('@/platform/useCatalogLive', () => ({ useCatalogLive: () => {} }));
vi.mock('@/platform/auth-client', () => ({
  authClient: { organizationRequest: vi.fn().mockRejectedValue(new Error('Offline')) },
}));
vi.mock('./ProductPicker', () => ({
  ProductPicker: ({ add }: { add: (item: PosItem) => void }) => (
    <button
      onClick={() =>
        add({
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Retained item',
          sku: 'KEEP',
          unitId: '00000000-0000-4000-8000-000000000002',
          units: [],
        })
      }
    >
      Add fixture
    </button>
  ),
}));
import { PosCheckout } from './PosCheckout';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('stops idle retained checkout polling and resumes without remounting the cart', () => {
  const seed = createDemoSeed(0, 'owner');
  const props = {
    business: seed.business,
    warehouse: seed.locations.find((l) => l.kind === 'warehouses')!,
    onLockChange: () => {},
  };
  const view = render(<PosCheckout {...props} active={false} />);
  expect(tick).not.toHaveBeenCalled();
  view.rerender(<PosCheckout {...props} active />);
  expect(tick).toHaveBeenCalledTimes(1);
  view.rerender(<PosCheckout {...props} active={false} />);
  expect(stop).toHaveBeenCalledTimes(1);
  view.rerender(<PosCheckout {...props} active />);
  expect(tick).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Add fixture' }));
  view.rerender(<PosCheckout {...props} active={false} />);
  expect(screen.getByRole('button', { name: 'View details for Retained item' })).toBeTruthy();
  // A hidden cart still needs invalidations; leaving the route must not stop its recovery.
  expect(stop).toHaveBeenCalledTimes(1);
});
