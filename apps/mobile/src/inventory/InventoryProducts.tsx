import { EmptyState } from '../ui/AsyncState';
import { posPriceLabel } from '@inventory/api-client';
import { ViewTabs } from '../ui/ViewTabs';
import type { ReactNode } from 'react';
import { IconAction } from '../ui/IconAction';
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import type { StockOverview } from '@inventory/contracts';
import { stockViews } from '@inventory/api-client';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { StatusBadge } from '../ui/StatusBadge';
import { SidePanel } from '../ui/SidePanel';
type Item = StockOverview['items'][number];
function Badge({ item }: { item: Item }) {
  return (
    <StatusBadge
      label={stockViews.find((v) => v.status === item.status)?.label ?? item.status}
      tone={
        item.status === 'in-stock' ? 'success' : item.status === 'low-stock' ? 'warning' : 'error'
      }
    />
  );
}
export function InventoryProducts({
  items,
  showEmpty = true,
  controls,
  onAdjust,
  onEdit,
}: {
  items: Item[];
  showEmpty?: boolean;
  controls?: ReactNode;
  onEdit?: ((productId: string) => void) | undefined;
  onAdjust?: ((sku: string) => void) | undefined;
}) {
  const theme = useTheme(),
    [grid, setGrid] = useState(false),
    [selection, setSelected] = useState<Item | null>(null);
  const { width, fontScale } = useWindowDimensions();
  const columns = grid && width >= 600 && fontScale <= 1.3;
  const selected = items.find((item) => item.id === selection?.id) ?? null;
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        {controls}
        <ViewTabs grid={grid} onChange={setGrid} label="Inventory" />
      </View>
      {showEmpty && !items.length && (
        <EmptyState
          message="No matching inventory"
          description="Try another search, stock status or warehouse to find products."
        />
      )}
      <View
        style={{
          flexDirection: grid ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: grid ? theme.spacing.small : 0,
        }}
      >
        {items.map((item, index) => (
          <View
            key={item.id}
            style={{
              width: columns ? '47%' : '100%',
              flexGrow: grid ? 1 : 0,
              gap: theme.spacing.small,
              padding: theme.spacing.medium,
              paddingTop: grid
                ? parseFloat(theme.tokens['native-target-size'])
                : theme.spacing.medium,
              borderRadius: grid ? theme.radius : 0,
              backgroundColor: index % 2 === 0 ? theme.tokens.muted : theme.tokens.card,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${item.name}`}
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({
                gap: theme.spacing.small,
                borderRadius: theme.radius,
                backgroundColor: pressed ? theme.tokens.selected : 'transparent',
              })}
            >
              {grid && (
                <View
                  style={{
                    aspectRatio: 4 / 3,
                    backgroundColor: theme.tokens.muted,
                    borderRadius: theme.radius,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text tone="muted">{item.sku}</Text>
                </View>
              )}
              <Text style={{ fontWeight: '600' }}>{item.name}</Text>
              <Text tone="muted">
                {item.sku} · {item.unit}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: theme.spacing.small,
                }}
              >
                <Text>Available: {item.available}</Text>
                <Badge item={item} />
                <Text>{item.price ? posPriceLabel({ price: item.price }) : 'Not priced'}</Text>
              </View>
            </Pressable>
            <IconAction
              label={`Actions for ${item.sku}`}
              icon="⋮"
              onPress={() => setSelected(item)}
            />
          </View>
        ))}
      </View>
      <SidePanel title="Product details" open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Text accessibilityRole="header">{selected.name}</Text>
            <Badge item={selected} />
            <Text>{selected.price ? posPriceLabel({ price: selected.price }) : 'Not priced'}</Text>
            {onEdit && selected.productId && (
              <Action
                label="Edit product details and pricing"
                onPress={() => {
                  setSelected(null);
                  onEdit(selected.productId!);
                }}
              />
            )}
            <Text>SKU: {selected.sku}</Text>
            <Text>Base unit: {selected.unit}</Text>
            {onAdjust && (
              <Action
                label="Adjust stock"
                onPress={() => {
                  onAdjust(selected.sku);
                  setSelected(null);
                }}
              />
            )}
            <Text>Available stock: {selected.available}</Text>
            <Text tone="muted">
              Selected warehouse at the last refresh. Reserved, damaged and in-transit quantities
              are excluded.
            </Text>
          </>
        )}
      </SidePanel>
    </>
  );
}
