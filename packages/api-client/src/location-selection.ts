import type { Location } from '@inventory/contracts';
/** Union of selected stores and warehouses within the already authorized workspace. */
export function selectedLocations(all: Location[], ids: string[]) {
  const selected = all.filter((l) => ids.includes(l.id) && l.kind !== 'terminals');
  if (!ids.length) return all;
  const warehouses = all.filter(
    (l) =>
      l.kind === 'warehouses' &&
      selected.some((s) => s.id === l.id || (s.kind === 'stores' && s.id === l.storeId)),
  );
  const warehouseIds = new Set(warehouses.map((l) => l.id));
  const storeIds = new Set([
    ...selected.filter((l) => l.kind === 'stores').map((l) => l.id),
    ...warehouses.map((l) => l.storeId),
  ]);
  return all.filter((l) =>
    l.kind === 'stores'
      ? storeIds.has(l.id)
      : l.kind === 'warehouses'
        ? warehouseIds.has(l.id)
        : warehouseIds.has(l.warehouseId ?? ''),
  );
}
