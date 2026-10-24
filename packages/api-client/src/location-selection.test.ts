import { expect, it } from 'vitest';
import { locationSchema } from '@inventory/contracts';
import { selectedLocations } from './location-selection.js';
it('unions selected stores and warehouses within the authorized input only', () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const make = (n: number, kind: 'stores' | 'warehouses', storeId: string | null = null) =>
    locationSchema.parse({
      id: id(n),
      kind,
      name: `Place ${n}`,
      code: `P${n}`,
      state: 'active',
      version: 1,
      storeId,
      warehouseId: null,
      type: kind === 'stores' ? 'store' : 'warehouse',
    });
  const all = [
    make(1, 'stores'),
    make(2, 'stores'),
    make(3, 'warehouses', id(1)),
    make(4, 'warehouses', id(2)),
  ];
  expect(selectedLocations(all, [])).toEqual(all);
  expect(selectedLocations(all, [id(1)]).map((l) => l.id)).toEqual([id(1), id(3)]);
  expect(selectedLocations(all, [id(3), id(4)]).map((l) => l.id)).toEqual(all.map((l) => l.id));
  expect(selectedLocations(all, [id(99)])).toEqual([]);
});
