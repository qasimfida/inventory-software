import { Table, TableScroll } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/AsyncState';
export function PayableEvidence({
  title,
  columns,
  rows,
  numeric = [],
  empty,
}: {
  title: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
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
                {columns.map((c, index) => (
                  <th key={c} scope="col" data-numeric={numeric.includes(index) || undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td key={index} data-numeric={numeric.includes(index) || undefined}>
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
          description="Only confirmed records in the current response are shown."
        />
      )}
    </section>
  );
}
