import type { ReactNode } from 'react';
import { Table, TableScroll } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/AsyncState';
export function AccountingTable({
  title,
  columns,
  rows,
  numeric = [],
  empty,
}: {
  title: string;
  columns: string[];
  rows: { id: string; cells: ReactNode[] }[];
  numeric?: number[];
  empty: string;
}) {
  return (
    <section className="min-w-0 shrink-0 space-y-2">
      <h3>{title}</h3>
      {rows.length ? (
        <TableScroll label={title}>
          <Table>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={c} scope="col" data-numeric={numeric.includes(i) || undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, i) => (
                    <td key={i} data-numeric={numeric.includes(i) || undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      ) : (
        <EmptyState
          message={empty}
          description="Only records returned by the accounting service are shown."
        />
      )}
    </section>
  );
}
