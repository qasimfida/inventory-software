import type { CountDetail } from '@inventory/contracts';
import { RecordDetails } from '@/components/common/RecordDetails';
import { EmptyState } from '@/components/common/AsyncState';
import { Table, TableScroll } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
/** Server-provided count evidence: never derive expected stock during blind capture. */
export function CountEvidence({ detail }: { detail: CountDetail }) {
  return (
    <>
      <RecordDetails
        label="Count session"
        items={[
          { label: 'Count reference', value: detail.count.id },
          { label: 'State', value: detail.count.state },
          { label: 'Version', value: String(detail.count.version) },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Expected stock is hidden during blind capture. Stock movement since snapshot requires a full
        recount. Owner approval is required before adjustments.
      </p>
      {!detail.lines.length ? (
        <EmptyState
          message="No count lines"
          description="Only explicitly selected products belong to this count."
        />
      ) : (
        <TableScroll label="Count lines">
          <Table>
            <thead>
              <tr>
                <th scope="col">Product / SKU</th>
                <th scope="col" data-numeric>
                  Counted
                </th>
                <th scope="col" data-numeric>
                  Expected
                </th>
                <th scope="col" data-numeric>
                  Attempt
                </th>
                <th scope="col">Review</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.id}>
                  <th scope="row">
                    <span className="block">{line.name}</span>
                    <span className="text-sm text-muted-foreground">{line.sku}</span>
                  </th>
                  <td data-numeric>{line.counted ?? 'Not counted'}</td>
                  <td data-numeric>{line.expected ?? 'Hidden'}</td>
                  <td data-numeric>{line.attempt}</td>
                  <td>
                    <StatusBadge tone={line.stale ? 'warning' : 'neutral'}>
                      {line.stale ? 'Recount required' : 'No movement flagged'}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </>
  );
}
