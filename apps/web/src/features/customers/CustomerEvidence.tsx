import { Table, TableScroll } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/AsyncState';
export function CustomerEvidence({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
}) {
  return (
    <section className="min-w-0 shrink-0 space-y-2">
      <h3>{title}</h3>
      {rows.length ? (
        <TableScroll label={title}>
          <Table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td key={index} className="tabular-nums">
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
          message={`No ${title.toLowerCase()} on this page`}
          description="Only recorded entries in the current response are shown."
        />
      )}
    </section>
  );
}
