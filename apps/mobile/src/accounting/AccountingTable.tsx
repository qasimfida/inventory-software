import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { RecordTable } from '../ui/RecordTable';
import { EmptyState } from '../ui/AsyncState';
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
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">{title}</Text>
      {rows.length ? (
        <RecordTable
          label={title}
          columns={columns}
          rows={rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell, i) =>
              numeric.includes(i) ? (
                <Text key={i} style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                  {cell}
                </Text>
              ) : (
                cell
              ),
            ),
          }))}
        />
      ) : (
        <EmptyState
          message={empty}
          description="Only records returned by the accounting service are shown."
        />
      )}
    </View>
  );
}
