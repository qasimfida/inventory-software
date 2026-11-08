import type { CountDetail } from '@inventory/contracts';
import { RecordDetails } from '../ui/RecordDetails';
import { EmptyState } from '../ui/AsyncState';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge } from '../ui/StatusBadge';
import { Text } from '../ui/Themed';
/** Server-provided count evidence; missing expected quantities remain hidden. */
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
      <Text tone="muted">
        Expected stock is hidden during blind capture. Stock movement since snapshot requires a full
        recount. Owner approval is required before adjustments.
      </Text>
      {!detail.lines.length ? (
        <EmptyState
          message="No count lines"
          description="Only explicitly selected products belong to this count."
        />
      ) : (
        <RecordTable
          label="Count lines"
          columns={['Product / SKU', 'Counted', 'Expected', 'Attempt', 'Review']}
          rows={detail.lines.map((line) => ({
            id: line.id,
            cells: [
              `${line.name} / ${line.sku}`,
              line.counted ?? 'Not counted',
              line.expected ?? 'Hidden',
              String(line.attempt),
              <StatusBadge
                key="review"
                tone={line.stale ? 'warning' : 'neutral'}
                label={line.stale ? 'Recount required' : 'No movement flagged'}
              />,
            ],
          }))}
        />
      )}
    </>
  );
}
