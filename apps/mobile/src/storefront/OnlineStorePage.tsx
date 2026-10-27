import { ScrollableTabs } from '../ui/ScrollableTabs';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { OnlineOverview } from './OnlineOverview';
import { OnlineProducts } from './OnlineProducts';
import { OnlineProductPicker } from './OnlineProductPicker';
import { OnlineProductDetails } from './OnlineProductDetails';
import type { Business, Location } from '@inventory/contracts';
import { useWorkspace } from '../shell/WorkspaceContext';
import { useNavigation } from '../shell/Navigation';
import { Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { EmptyState } from '../ui/AsyncState';
import { OnlineStoreEditor } from './OnlineStoreEditor';
export function OnlineStorePage({
  business,
  locations,
  path,
}: {
  business: Business;
  locations: Location[];
  path: string;
}) {
  const theme = useTheme();
  const { storeId, setStoreId, locked } = useWorkspace(),
    { navigate } = useNavigation();
  const stores = locations.filter(
    (l) =>
      l.kind === 'stores' &&
      l.state === 'active' &&
      (!business.scope?.storeId || business.scope.storeId === l.id),
  );
  const selected = stores.find((s) => s.id === storeId)?.id ?? stores[0]?.id;
  if (!selected)
    return (
      <EmptyState
        message="No available stores"
        description="Create an active store and link a warehouse before configuring an online store."
      />
    );
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScrollableTabs>
            {(['Overview', 'Products', 'Settings'] as const).map((label) => {
              const selectedTab =
                label === 'Overview'
                  ? path === '/online-store'
                  : path.startsWith('/online-store/' + label.toLowerCase());
              return (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selectedTab }}
                  onPress={() =>
                    navigate(
                      label === 'Overview'
                        ? '/online-store'
                        : label === 'Settings'
                          ? '/online-store/settings/general'
                          : '/online-store/products',
                    )
                  }
                  style={{
                    padding: theme.spacing.small,
                    borderRadius: theme.controlRadius,
                    backgroundColor: selectedTab ? theme.colors.card : 'transparent',
                  }}
                >
                  <Text>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollableTabs>
        </View>
        {stores.length > 1 && (
          <>
            <Choice
              label="Online store location"
              value={selected}
              disabled={locked || stores.length < 2}
              onChange={setStoreId}
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          </>
        )}
      </View>
      {path === '/online-store' ? (
        <OnlineOverview
          key={`${business.id}:${selected}:${business.role}:${business.permissions?.join(',')}`}
          business={business}
          storeId={selected}
        />
      ) : path.startsWith('/online-store/products') ? (
        <OnlineProductRoutes
          key={`${business.id}:${selected}:${business.role}:${business.permissions?.join(',')}`}
          business={business}
          locations={locations}
          storeId={selected}
          path={path}
          close={() => navigate('/online-store/products')}
        />
      ) : (
        <OnlineStoreEditor
          key={`${business.id}:${selected}:${business.role}:${business.permissions?.join(',')}`}
          business={business}
          storeId={selected}
          locations={locations}
          path={path}
        />
      )}
    </>
  );
}

function OnlineProductRoutes({
  business,
  locations,
  storeId,
  path,
  close,
}: {
  business: Business;
  locations: Location[];
  storeId: string;
  path: string;
  close: () => void;
}) {
  if (path !== '/online-store/products' && !path.endsWith('/add'))
    return (
      <OnlineProductDetails
        business={business}
        storeId={storeId}
        id={path.split('/').pop()!}
        onClose={close}
      />
    );
  return (
    <>
      <OnlineProducts business={business} storeId={storeId} locations={locations} />
      {path.endsWith('/add') && (
        <OnlineProductPicker business={business} storeId={storeId} onClose={close} />
      )}
    </>
  );
}
