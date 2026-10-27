// @vitest-environment jsdom
import { useSyncExternalStore } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { PosModel, createSalesClient } from '@inventory/api-client';
import { HeldCarts } from './HeldCarts';
afterEach(cleanup);
const id = '00000000-0000-4000-8000-000000000001';
function Example({ model }: { model: PosModel }) {
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  return <HeldCarts model={model} state={state} />;
}
it('native operators can hold and resume a labelled draft without a server write', async () => {
  const request = vi.fn(),
    model = new PosModel(
      createSalesClient(request, () => id, id),
      id,
    ),
    user = userEvent.setup();
  model.add({ id, name: 'Mug', sku: 'MUG', unitId: id, units: [{ id, code: 'EA' }] });
  render(<Example model={model} />);
  await user.type(screen.getByLabelText('Cart name (avoid personal information)'), 'Counter');
  await user.click(screen.getByRole('button', { name: 'Hold current cart' }));
  expect(model.snapshot().lines).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Resume Counter' }));
  expect(model.snapshot().lines[0]?.sku).toBe('MUG');
  expect(request).not.toHaveBeenCalled();
});
