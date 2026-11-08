import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { currencySchema } from '@inventory/contracts';
import type { Report } from '@inventory/contracts';
import { reportSections } from '@inventory/api-client';
import { ExportRecords } from '@/components/common/ExportRecords';
import { MetricCard } from '@/components/common/MetricCard';
import { EmptyState } from '@/components/common/AsyncState';
import { RecordDetails } from '@/components/common/RecordDetails';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, TableScroll } from '@/components/ui/Table';

/** Presents only the loaded response; draft filters never relabel confirmed evidence. */
export function ReportResults({ data }: { data: Report }) {
  const { formatMinorUnits } = useDisplayMoney();

  const value = (row: Report['rows'][number]) => {
    const code = row.unit.endsWith(' minor units')
      ? currencySchema.safeParse(row.unit.split(' ')[0])
      : null;
    return code?.success ? formatMinorUnits(row.value, code.data) : row.value;
  };
  const title = reportSections.find((s) => s.value === data.section)?.label ?? 'Report';
  return (
    <section className="report-results min-w-0 space-y-4" aria-label="Report results">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>{title}</h2>
        <div className="report-export">
          <ExportRecords
            name="report-shown"
            label="Export shown rows"
            headers={['Measure', 'Value', 'Unit', 'From', 'To', 'As of']}
            rows={data.rows.map((row) => [
              row.label,
              row.value,
              row.unit,
              data.from,
              data.to,
              data.asOf,
            ])}
          />
        </div>
      </div>
      <RecordDetails
        label="Report context"
        items={[
          { label: 'Date range (inclusive UTC)', value: `${data.from} — ${data.to}` },
          { label: 'As of (UTC)', value: data.asOf },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="neutral">{data.rows.length} shown rows</StatusBadge>
        {data.hasMore && <StatusBadge tone="info">More rows available</StatusBadge>}
        <p className="text-sm text-muted-foreground">
          Export includes shown rows only. Values retain their stated units.
        </p>
      </div>
      {data.section !== 'inventory' && data.section !== 'movements' && !!data.rows.length && (
        <div className="metric-grid report-metrics">
          {data.rows.slice(0, 4).map((row, index) => (
            <MetricCard
              key={row.key}
              label={row.label}
              value={value(row)}
              unit={row.unit.replace(' minor units', ' (original)')}
              primary={index === 0}
            />
          ))}
        </div>
      )}
      {!data.rows.length ? (
        <EmptyState
          message="No matching records for this report."
          description="Try another date range, warehouse or report category, then run the report again."
        />
      ) : (
        <TableScroll label="Report table">
          <Table>
            <caption className="sr-only">Report values and units</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" data-numeric>
                  Value
                </th>
                <th scope="col">Unit</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td data-numeric>{value(row)}</td>
                  <td>{row.unit.replace(' minor units', ' (original)')}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      {!!data.notes.length && (
        <section aria-label="Report notes" className="space-y-2">
          <h3>How to read this report</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
