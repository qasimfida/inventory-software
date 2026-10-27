import type { Business, Location } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { View } from 'react-native';
import { useWorkspace } from '../shell/WorkspaceContext';
import { useNavigation } from '../shell/Navigation';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { useOnlineCollection } from './useOnlineCollection';
export function ProductChannels({
  business,
  locations,
  productId,
}: {
  business: Business;
  locations: Location[];
  productId: string;
}) {
  if (!hasPermission(business, 'onlineStore.view'))
    return <Text>Online store viewing permission is required.</Text>;
  return (
    <>
      {locations
        .filter(
          (l) =>
            l.kind === 'stores' &&
            l.state === 'active' &&
            (!business.scope?.storeId || l.id === business.scope.storeId),
        )
        .map((store) => (
          <StoreChannel key={store.id} business={business} store={store} productId={productId} />
        ))}
    </>
  );
}
function StoreChannel({
  business,
  store,
  productId,
}: {
  business: Business;
  store: Location;
  productId: string;
}) {
  const c = useOnlineCollection([productId], { business, storeId: store.id }),
    { setStoreId } = useWorkspace(),
    { navigate } = useNavigation(),
    l = c.items.find((i) => i.productId === productId);
  function open() {
    setStoreId(store.id);
    navigate('/online-store/products/' + l!.id);
  }
  return (
    <View>
      <Text accessibilityRole="header">{store.name}</Text>
      <Text>
        {l
          ? {
              active: 'Online · Live',
              paused: 'Paused',
              ready: 'Ready',
              needs_changes: 'Needs changes',
              selected: 'Needs changes',
            }[l.status]
          : 'Not listed'}
      </Text>
      {!!c.error && <Text accessibilityLiveRegion="polite">{c.error}</Text>}
      {l ? (
        <>
          <Action label="View issues and actions" onPress={open} />
          {c.manage && (
            <>
              {(l.status === 'active' || l.status === 'paused') && (
                <Action
                  disabled={c.busy}
                  label={l.status === 'paused' ? 'Resume' : 'Pause'}
                  onPress={() => {
                    void c.transition(l);
                  }}
                />
              )}
              <Action label="Remove from store…" onPress={open} />
            </>
          )}
        </>
      ) : (
        c.manage && (
          <Action
            disabled={c.busy}
            label="Add to online store"
            onPress={() => void c.add([productId])}
          />
        )
      )}
    </View>
  );
}
