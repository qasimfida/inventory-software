import * as Tabs from '@radix-ui/react-tabs';
import { OverflowTabs } from '@/components/common/OverflowTabs';
import { OnlineOverview } from './OnlineOverview';
import type { Business, Location } from '@inventory/contracts';
import { useNavigate } from 'react-router-dom';
import { OnlineProducts } from './OnlineProducts';
import { OnlineProductPicker } from './OnlineProductPicker';
import { OnlineProductDetails } from './OnlineProductDetails';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { FormField } from '@/components/common/FormField';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/common/AsyncState';
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
  const navigate = useNavigate();
  const { storeId, setStoreId, locked } = useWorkspace();
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
    <Tabs.Root
      value={
        path.startsWith('/online-store/products')
          ? 'products'
          : path.startsWith('/online-store/settings')
            ? 'settings'
            : 'overview'
      }
      onValueChange={(tab) =>
        void navigate(
          tab === 'overview'
            ? '/online-store'
            : tab === 'settings'
              ? '/online-store/settings/general'
              : '/online-store/products',
        )
      }
      className="settings-layout min-w-0 space-y-5"
    >
      <div className="online-store-navigation flex flex-wrap items-center justify-between gap-3 bg-background">
        <div className="min-w-0">
          <OverflowTabs label="Online store">
            <Tabs.List
              className="settings-navigation settings-tabs view-tabs"
              aria-label="Online store navigation"
            >
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="products">Products</Tabs.Trigger>
              <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            </Tabs.List>
          </OverflowTabs>
        </div>
        {stores.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <FormField label="Online store location">
              {(props) => (
                <Select
                  {...props}
                  value={selected}
                  disabled={locked || stores.length < 2}
                  onChange={(e) => setStoreId(e.target.value)}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>
        )}
      </div>
      {path === '/online-store' ? (
        <OnlineOverview
          key={`${business.id}:${selected}:${business.role}:${business.permissions?.join(',')}`}
          business={business}
          storeId={selected}
        />
      ) : path.startsWith('/online-store/products') ? (
        <div key={`${business.id}:${selected}:${business.role}:${business.permissions?.join(',')}`}>
          <OnlineProducts business={business} storeId={selected} locations={locations} />
          {path.endsWith('/add') ? (
            <OnlineProductPicker
              business={business}
              storeId={selected}
              onClose={() => void navigate('/online-store/products')}
            />
          ) : path !== '/online-store/products' ? (
            <OnlineProductDetails
              business={business}
              storeId={selected}
              id={path.split('/').pop()!}
              onClose={() => void navigate('/online-store/products')}
            />
          ) : null}
        </div>
      ) : (
        <OnlineStoreEditor
          key={`${business.id}:${selected}:${business.role}:${business.permissions?.join(',')}`}
          business={business}
          storeId={selected}
          locations={locations}
          path={path}
        />
      )}
    </Tabs.Root>
  );
}
