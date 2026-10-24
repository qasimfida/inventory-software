import type { createInventoryClient } from '@inventory/api-client';
import { Table, TableScroll } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/AsyncState';
type Stock = Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>;
export function StockTable({ stock }: { stock: Stock }) {
  const { balances } = stock;
  if (!balances.length)
    return <EmptyState message="No stock balances match this warehouse and search." />;
  return (
    <TableScroll label="Inventory snapshot">
      <Table>
        <caption className="sr-only">Inventory snapshot, exact quantities by location</caption>
        <thead>
          <tr>
            {[
              'SKU',
              'Location',
              'Unit',
              'On hand',
              'Reserved',
              'Damaged',
              'Available',
              'In transit',
            ].map((label, index) => (
              <th key={label} scope="col" data-numeric={index > 2 || undefined}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {balances.map((b) => (
            <tr key={`${b.variantId}-${b.locationId}`}>
              <th scope="row">{b.sku}</th>
              <td>{b.locationName}</td>
              <td>
                {stock.units.find(
                  (unit) =>
                    unit.id === stock.items.find((item) => item.id === b.variantId)?.baseUnitId,
                )?.code ?? 'Base unit'}
              </td>
              <td data-numeric>{b.onHand}</td>
              <td data-numeric>{b.reserved}</td>
              <td data-numeric>{b.damaged}</td>
              <td data-numeric className="font-semibold text-primary">
                {b.available}
              </td>
              <td data-numeric>{b.inTransit}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
}
