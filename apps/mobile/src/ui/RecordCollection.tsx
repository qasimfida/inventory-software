import { ExportRecords } from './ExportRecords';
import { EmptyState } from './AsyncState';
import type { ReactNode } from 'react';
import { ViewTabs } from './ViewTabs';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Action } from './Controls';
import { Text } from './Themed';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '../theme';
export function RecordCollection({
  items,
  label,
  onOpen,
  toolbar,
  emptyState,
  actions,
  showExport = true,
  allowGrid = true,
}: {
  items: {
    id: string;
    title: string;
    subtitle: string;
    detail: string;
    /** Original evidence for CSV when the display includes an indicative equivalent. */
    exportDetail?: string;
    status: string;
    tone: 'success' | 'warning' | 'neutral';
  }[];
  toolbar?: ReactNode;
  /** Optional loading, failure or contextual empty content supplied by the owning screen. */
  emptyState?: ReactNode;
  /** Permission-aware creation commands, placed after filters and view controls. */
  actions?: ReactNode;
  /** Hide only when the owning screen renders its export in the page action row. */
  showExport?: boolean;
  /** Use a fixed list for transaction history; product browsing keeps both views. */
  allowGrid?: boolean;
  label: string;
  onOpen: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const theme = useTheme(),
    [gridSelected, setGrid] = useState(false);
  const grid = allowGrid && gridSelected;
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
        {allowGrid && <ViewTabs label={label} grid={grid} onChange={setGrid} />}
        {showExport && (
          <ExportRecords
            headers={['Name', 'Reference', 'Details', 'Status']}
            rows={items.map((item) => [
              item.title,
              item.subtitle,
              item.exportDetail ?? item.detail,
              item.status,
            ])}
          />
        )}
        {actions}
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
              width: grid && width >= 560 ? '47%' : '100%',
              flexGrow: 1,
              padding: theme.spacing.small,
              gap: theme.spacing.small,
              borderWidth: grid ? 1 : 0,
              borderColor: theme.tokens.border,
              borderRadius: theme.radius,
              backgroundColor: !grid && index % 2 === 0 ? theme.tokens.muted : theme.colors.card,
            }}
          >
            <Action label={item.title} variant="ghost" onPress={() => onOpen(item.id)} />
            <Text tone="muted">{item.subtitle}</Text>
            <Text tone="muted">{item.detail}</Text>
            <StatusBadge label={item.status} tone={item.tone} />
          </View>
        ))}
      </View>
      {!items.length && (emptyState ?? <EmptyState message={`No matching ${label}.`} />)}
    </View>
  );
}
