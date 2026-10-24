import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';
/** Native horizontal table: exact values wrap, with all actions reachable by touch. */
export function RecordTable({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: string[];
  rows: { id: string; cells: ReactNode[] }[];
}) {
  const theme = useTheme(),
    width = theme.spacing.large * 7;
  return (
    <ScrollView horizontal accessibilityLabel={label}>
      <View>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.tokens.secondary,
            borderBottomWidth: 1,
            borderColor: theme.tokens.border,
          }}
        >
          {columns.map((column) => (
            <View key={column} style={{ width, padding: theme.spacing.small }}>
              <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
                {column}
              </Text>
            </View>
          ))}
        </View>
        {rows.map((row, index) => (
          <View
            key={row.id}
            style={{
              flexDirection: 'row',
              backgroundColor: index % 2 === 0 ? theme.tokens.muted : theme.tokens.card,
              borderBottomWidth: 1,
              borderColor: theme.tokens.border,
            }}
          >
            {row.cells.map((cell, col) => (
              <View key={col} style={{ width, padding: theme.spacing.small }}>
                {typeof cell === 'string' ? <Text>{cell}</Text> : cell}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
