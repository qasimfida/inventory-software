import { useDisplayMoney } from '../ui/useDisplayMoney';
import { View } from 'react-native';
import { currencySchema } from '@inventory/contracts';
import type { Report } from '@inventory/contracts';
import { reportSections } from '@inventory/api-client';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { ExportRecords } from '../ui/ExportRecords';
import { MetricCard } from '../ui/MetricCard';
import { EmptyState } from '../ui/AsyncState';
import { RecordDetails } from '../ui/RecordDetails';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge } from '../ui/StatusBadge';

/** Presents only the loaded response; draft filters never relabel confirmed evidence. */
export function ReportResults({ data }: { data: Report }) {
  const { formatMinorUnits } = useDisplayMoney();

  const theme = useTheme();
  const value = (row: Report['rows'][number]) => {
    const code = row.unit.endsWith(' minor units')
      ? currencySchema.safeParse(row.unit.split(' ')[0])
      : null;
    return code?.success ? formatMinorUnits(row.value, code.data) : row.value;
  };
  const title = reportSections.find((s) => s.value === data.section)?.label ?? 'Report';
  return (
    <View accessibilityLabel="Report results" style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">{title}</Text>
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
      <RecordDetails
        label="Report context"
        items={[
          { label: 'Date range (inclusive UTC)', value: `${data.from} — ${data.to}` },
          { label: 'As of (UTC)', value: data.asOf },
        ]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        <StatusBadge tone="neutral" label={`${data.rows.length} shown rows`} />
        {data.hasMore && <StatusBadge tone="info" label="More rows available" />}
      </View>
      <Text tone="muted">Export includes shown rows only. Values retain their stated units.</Text>
      {data.section !== 'inventory' && data.section !== 'movements' && !!data.rows.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.medium }}>
          {data.rows.slice(0, 4).map((row, index) => (
            <MetricCard
              key={row.key}
              label={row.label}
              value={value(row)}
              unit={row.unit.replace(' minor units', ' (original)')}
              primary={index === 0}
            />
          ))}
        </View>
      )}
      {!data.rows.length ? (
        <EmptyState
          message="No matching records for this report."
          description="Try another date range, warehouse or report category, then run the report again."
        />
      ) : (
        <RecordTable
          label="Report table"
          columns={['Measure', 'Value', 'Unit']}
          rows={data.rows.map((row) => ({
            id: row.key,
            cells: [
              row.label,
              <Text key="value" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                {value(row)}
              </Text>,
              row.unit.replace(' minor units', ' (original)'),
            ],
          }))}
        />
      )}
      {!!data.notes.length && (
        <View accessibilityLabel="Report notes" style={{ gap: theme.spacing.small }}>
          <Text accessibilityRole="header">How to read this report</Text>
          {data.notes.map((note) => (
            <Text key={note} tone="muted">
              {note}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
