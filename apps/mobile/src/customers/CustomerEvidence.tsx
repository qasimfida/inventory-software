import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { RecordTable } from '../ui/RecordTable';
import { EmptyState } from '../ui/AsyncState';
export function CustomerEvidence({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">{title}</Text>
      {rows.length ? (
        <RecordTable label={title} columns={columns} rows={rows} />
      ) : (
        <EmptyState
          message={`No ${title.toLowerCase()} on this page`}
          description="Only recorded entries in the current response are shown."
        />
      )}
    </View>
  );
}
