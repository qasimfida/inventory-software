import { useDisplayMoney } from '../ui/useDisplayMoney';
import { Pressable } from 'react-native';
import { RichDescription } from '../ui/RichDescription';
import { IconAction } from '../ui/IconAction';
import { OnlineCollectionFeedback } from '../storefront/OnlineCollectionFeedback';
import { Checkbox } from '../ui/Checkbox';
import { useOnlineCollection } from '../storefront/useOnlineCollection';
import { useNavigation } from '../shell/Navigation';
import { EmptyState } from '../ui/AsyncState';

import { useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import type { Product } from '@inventory/contracts';
import { useTheme } from '../theme';
import { Action } from '../ui/Controls';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { StatusBadge } from '../ui/StatusBadge';
export function CatalogProducts({
  products,
  filtered = false,
  onCreate,
  grid,
  writable,
  onEdit,
  onPricing,
}: {
  products: Product[];
  filtered?: boolean;
  onCreate?: (() => void) | undefined;
  grid: boolean;
  writable: boolean;
  onEdit: (product: Product) => void;
  onPricing: (id: string) => void;
}) {
  const { posPriceLabel } = useDisplayMoney();

  const { navigate } = useNavigation();
  const theme = useTheme(),
    { width, fontScale } = useWindowDimensions();
  const columns = grid && width >= 600 && fontScale <= 1.3;
  const channels = useOnlineCollection(products.map((p) => p.id));
  const [actions, setActions] = useState<Product | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((p) => p.id === selectedId);
  return (
    <>
      <OnlineCollectionFeedback channels={channels} />
      {channels.manage && channels.selected.length > 0 && (
        <>
          <Text>{channels.selected.length} selected</Text>
          <Action
            disabled={channels.busy}
            label="Add to online store"
            onPress={() => void channels.add(channels.selected)}
          />
          <Action
            variant="ghost"
            label="Clear selection"
            onPress={() => channels.setSelected([])}
          />
        </>
      )}
      {!products.length && (
        <EmptyState
          message={filtered ? 'No matching products' : 'No products yet'}
          description={
            filtered
              ? 'Try another search or clear your filters to see more products.'
              : 'Add your first product to start managing your catalog.'
          }
          action={
            writable && !filtered && onCreate
              ? { label: 'Add product', onPress: onCreate }
              : undefined
          }
        />
      )}
      <View
        style={{
          flexDirection: columns ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: theme.spacing.small,
        }}
      >
        {products.map((p, index) => (
          <View
            key={p.id}
            style={{
              width: columns ? '47%' : '100%',
              flexGrow: 1,
              minWidth: 0,
              gap: theme.spacing.small,
              padding: theme.spacing.small,
              paddingTop: theme.spacing.small,
              borderRadius: theme.radius,
              backgroundColor: grid || index % 2 === 0 ? theme.colors.card : theme.tokens.muted,
            }}
          >
            {channels.manage && (
              <>
                <Checkbox
                  label={`Select ${p.name} for online store`}
                  value={channels.selected.includes(p.id)}
                  onChange={() => channels.toggle(p.id)}
                />
              </>
            )}
            {channels.items.some((l) => l.productId === p.id && l.status === 'active') && (
              <StatusBadge label="Online" tone="success" />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View details for ${p.name}`}
              onPress={() => setSelectedId(p.id)}
            >
              {grid && (
                <View
                  style={{
                    aspectRatio: 3 / 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.tokens.muted,
                    borderRadius: theme.radius,
                  }}
                >
                  {p.images[0] ? (
                    <Image
                      source={{ uri: p.images[0] }}
                      accessibilityLabel={p.name}
                      resizeMode="contain"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Text tone="muted">{p.sku}</Text>
                  )}
                </View>
              )}
              <Text>{p.name}</Text>
              <Text tone="muted">{p.sku}</Text>
              <Text>{p.price ? posPriceLabel({ price: p.price }) : 'Not priced'}</Text>
              <StatusBadge label={p.state} tone={p.state === 'active' ? 'success' : 'neutral'} />
            </Pressable>
            <IconAction label={`Actions for ${p.name}`} icon="⋮" onPress={() => setActions(p)} />
          </View>
        ))}
      </View>
      <SidePanel title="Product actions" open={!!actions} onClose={() => setActions(null)}>
        {actions && (
          <>
            <Action
              label="View details"
              onPress={() => {
                setSelectedId(actions.id);
                setActions(null);
              }}
            />
            <Action
              label="Variants and pricing"
              onPress={() => {
                onPricing(actions.id);
                setActions(null);
              }}
            />
            <Action
              label="Edit product"
              disabled={!writable || actions.state === 'archived'}
              onPress={() => {
                onEdit(actions);
                setActions(null);
              }}
            />
            {channels.manage && (
              <Action
                label="Add to online store"
                disabled={channels.busy}
                onPress={() => {
                  void channels.add([actions.id]);
                  setActions(null);
                }}
              />
            )}
          </>
        )}
      </SidePanel>
      <SidePanel title="Product details" open={!!selected} onClose={() => setSelectedId(null)}>
        {selected && (
          <Action
            label="Open full product details"
            onPress={() => {
              setSelectedId(null);
              navigate(`/catalog/${selected.id}`);
            }}
          />
        )}
        {selected && (
          <>
            <Text accessibilityRole="header">{selected.name}</Text>
            <Text>
              {selected.sku} · {selected.state} · {selected.type}
            </Text>
            <Text>{selected.price ? posPriceLabel({ price: selected.price }) : 'Not priced'}</Text>
            {writable && selected.state !== 'archived' && (
              <Action
                label="Edit product details and pricing"
                onPress={() => {
                  setSelectedId(null);
                  onEdit(selected);
                }}
              />
            )}
            <RichDescription value={selected.description} />
            <Text>Barcodes: {selected.barcodes.join(', ') || 'None'}</Text>
            <Text>Alternative codes: {selected.alternativeCodes.join(', ') || 'None'}</Text>
            <Text>Inventory tracking: {selected.trackInventory ? 'Enabled' : 'Disabled'}</Text>
          </>
        )}
      </SidePanel>
    </>
  );
}
