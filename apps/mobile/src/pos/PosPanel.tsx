import { PageTitleContext } from '../ui/ScreenHeader';
import { useReachability } from '../platform/useReachability';
import { lazy, Suspense } from 'react';
const OfflinePanel = lazy(() =>
  import('../offline/OfflinePanel').then((module) => ({ default: module.OfflinePanel })),
);
import { useTheme } from '../theme';
import { Alert } from 'react-native';
import { IconAction } from '../ui/IconAction';
import { Text } from '../ui/Themed';
import { hasPermission } from '@inventory/contracts';
import { useContext, useEffect, useState } from 'react';
import type { Business, Location } from '@inventory/contracts';
import { PosCheckout } from './PosCheckout';
import { View } from 'react-native';
import { Action } from '../organization/Controls';
export function PosPanel({
  business,
  locations,
  close,
  onLockChange,
  showBack = true,
}: {
  business: Business;
  locations: Location[];
  close: () => void;
  showBack?: boolean;
  onLockChange?: (locked: boolean) => void;
}) {
  const pageTitle = useContext(PageTitleContext);
  const online = useReachability();
  const preferences = useTheme().preferences;
  const [cached, setCached] = useState(false);
  const warehouses = locations.filter((l) => l.kind === 'warehouses'),
    [locked, setLocked] = useState(false),
    warehouseId = warehouses.find((w) => w.state === 'active')?.id ?? '',
    warehouse = warehouses.find((w) => w.id === warehouseId);
  useEffect(() => {
    onLockChange?.(locked);
    return () => onLockChange?.(false);
  }, [locked, onLockChange]);
  if (!online && !locked && !cached) setCached(true);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {pageTitle !== 'Point of sale' && <Text accessibilityRole="header">Point of sale</Text>}
        <IconAction
          icon="ⓘ"
          label="Payment guidance"
          onPress={() =>
            Alert.alert(
              'Payment guidance',
              'Online cash and authorized credit. Amounts use currency minor units. Review quoted totals and confirm cash actually received. After reload or session lock, inspect sale history before retrying an uncertain sale.',
            )
          }
        />
      </View>
      <Text tone="muted">Find products, review your cart and confirm payment.</Text>
      {showBack && (
        <IconAction label="Back to management" disabled={locked} onPress={close} icon="←" />
      )}
      {!online && (
        <Text accessibilityLiveRegion="polite">
          Connection unavailable. Cached cash checkout requires a prepared, unlocked register. Any
          live cart is retained until cleared or connectivity returns.
        </Text>
      )}
      <Action
        variant="outline"
        disabled={locked}
        label={cached ? 'Use live checkout' : 'Use cached products'}
        onPress={() => setCached(!cached)}
      />
      {warehouse && warehouse.state === 'active' && hasPermission(business, 'sales.write') ? (
        cached ? (
          <Suspense fallback={<Text>Loading cached checkout…</Text>}>
            <OfflinePanel
              embedded
              setup={{
                businessId: business.id,
                warehouseId: warehouse.id,
                currency: preferences.currency,
              }}
              onLockChange={setLocked}
            />
          </Suspense>
        ) : (
          <PosCheckout
            key={warehouse.id}
            business={business}
            warehouse={warehouse}
            onLockChange={setLocked}
          />
        )
      ) : (
        <Text>
          Checkout requires an active warehouse and sale permission. History remains available.
        </Text>
      )}
    </View>
  );
}
