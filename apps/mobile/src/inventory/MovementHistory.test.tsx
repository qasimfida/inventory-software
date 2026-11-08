// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { stockWorkspaceSchema } from '@inventory/contracts';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readInventory } from '../../../../packages/api-client/src/mock/read-inventory';
import { MovementHistory } from './MovementHistory';
afterEach(cleanup);
it('keeps exact native ledger evidence in a labelled table and read-only detail panel', () => {
  const seed = createDemoSeed(0, 'owner');
  const stock = stockWorkspaceSchema.parse(
    readInventory(seed, 'stock', new URLSearchParams({ warehouseId: seed.id(3) }), false),
  );
  render(<MovementHistory stock={stock} timeZone="UTC" />);
  expect(screen.getByLabelText('Stock movement history')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button')[0]!);
  expect(screen.getByText('Actor reference')).toBeTruthy();
  expect(screen.getByText('Movement reference')).toBeTruthy();
  expect(screen.getAllByText(stock.movements[0]!.reason).length).toBeGreaterThanOrEqual(2);
});
