import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { RecordTable } from '../ui/RecordTable';
import { EmptyState } from '../ui/AsyncState';
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
            cells: row.cells.map((cell, index) =>
              numeric.includes(index) ? (
                <Text key={index} style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
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
          description="Only confirmed records in the current response are shown."
        />
      )}
    </View>
  );
}
