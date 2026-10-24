import { EmptyState } from './AsyncState';
import type { ReactNode } from 'react';
import { ViewTabs } from './ViewTabs';
import { useState } from 'react';
import { View } from 'react-native';
import { Action } from './Controls';
import { Text } from './Themed';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '../theme';
export function RecordCollection({
  items,
  label,
  onOpen,
  toolbar,
}: {
  items: {
    id: string;
    title: string;
    subtitle: string;
    detail: string;
    status: string;
    tone: 'success' | 'warning' | 'neutral';
  }[];
  toolbar?: ReactNode;
  label: string;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme(),
    [grid, setGrid] = useState(false);
  return (
    <View style={{ gap: theme.spacing.small }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        {toolbar}
        <ViewTabs label={label} grid={grid} onChange={setGrid} />
      </View>
      <View
        style={{
          flexDirection: grid ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: theme.spacing.small,
        }}
      >
        {items.map((item, index) => (
          <View
            key={item.id}
            style={{
              width: grid ? '47%' : '100%',
              flexGrow: 1,
              padding: theme.spacing.small,
              paddingTop: grid
                ? parseFloat(theme.tokens['native-target-size'])
                : theme.spacing.small,
              borderRadius: theme.radius,
              backgroundColor: !grid && index % 2 === 0 ? theme.tokens.muted : theme.colors.card,
            }}
          >
            <Action label={item.title} variant="ghost" onPress={() => onOpen(item.id)} />
            <Text>{item.subtitle}</Text>
            <Text>{item.detail}</Text>
            <StatusBadge label={item.status} tone={item.tone} />
          </View>
        ))}
      </View>
      {!items.length && <EmptyState message={`No matching ${label}.`} />}
    </View>
  );
}
