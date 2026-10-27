import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Business, Location } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { Button } from '@/components/ui/Button';
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
    return <p>Online store viewing permission is required.</p>;
  return (
    <div className="space-y-3">
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
    </div>
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
    navigate = useNavigate(),
    l = c.items.find((i) => i.productId === productId);
  function open() {
    setStoreId(store.id);
    void navigate('/online-store/products/' + l!.id);
  }
  return (
    <section className="rounded-lg border p-3 space-y-2">
      <h4>{store.name}</h4>
      <StatusBadge>
        {l
          ? {
              active: 'Online · Live',
              paused: 'Paused',
              ready: 'Ready',
              needs_changes: 'Needs changes',
              selected: 'Needs changes',
            }[l.status]
          : 'Not listed'}
      </StatusBadge>
      {c.error && <p role="status">{c.error}</p>}
      <div className="flex flex-wrap gap-2">
        {l ? (
          <>
            <Button variant="outline" onClick={open}>
              View issues and actions
            </Button>
            {c.manage && (
              <>
                {(l.status === 'active' || l.status === 'paused') && (
                  <Button
                    disabled={c.busy}
                    onClick={() => {
                      void c.transition(l);
                    }}
                  >
                    {l.status === 'paused' ? 'Resume' : 'Pause'}
                  </Button>
                )}
                <Button variant="destructive" onClick={open}>
                  Remove from store…
                </Button>
              </>
            )}
          </>
        ) : (
          c.manage && (
            <Button disabled={c.busy} onClick={() => void c.add([productId])}>
              Add to online store
            </Button>
          )
        )}
      </div>
    </section>
  );
}
