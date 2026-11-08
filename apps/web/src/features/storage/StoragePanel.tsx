import { useState, type ReactNode } from 'react';
import type { Business, Location } from '@inventory/contracts';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { EmptyState } from '@/components/common/AsyncState';
import * as Tabs from '@radix-ui/react-tabs';
import { StorageManagementPanel } from './StorageManagementPanel';
import { WarehouseViewPanel } from '../visualization/WarehouseViewPanel';
/** One warehouse scope with persistent actions; hierarchy refreshes after successful mutations. */
export function StoragePanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((location) => location.kind === 'warehouses');
  const [selected, setSelected] = useState(''),
    [tab, setTab] = useState('Locations');
  const warehouseId = warehouses.find((w) => w.id === selected)?.id ?? warehouses[0]?.id ?? '';
  const renderHeader = (actions: ReactNode) => (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs.List className="view-tabs" aria-label="Storage view">
        <Tabs.Trigger value="Locations">Locations</Tabs.Trigger>
        <Tabs.Trigger value="Browse hierarchy">Browse hierarchy</Tabs.Trigger>
      </Tabs.List>
      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      <WarehouseSelect
        label="Warehouse"
        id="storage-warehouse"
        value={warehouseId}
        onChange={(event) => setSelected(event.target.value)}
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
            {w.state === 'active' ? '' : ` (${w.state})`}
          </option>
        ))}
      </WarehouseSelect>
    </div>
  );
  return (
    <section className="screen-section" aria-label="Warehouse & storage">
      <ScreenHeader title="Warehouse & storage" />
      <Tabs.Root value={tab} onValueChange={setTab} className="space-y-4">
        {!warehouseId ? (
          <>
            {renderHeader(null)}
            <EmptyState message="No warehouses available in this workspace. Ask an administrator to add a warehouse or update your access." />
          </>
        ) : (
          <StorageManagementPanel
            key={warehouseId}
            business={business}
            locations={locations}
            warehouseId={warehouseId}
            renderHeader={renderHeader}
            renderBody={
              tab === 'Browse hierarchy'
                ? (revision) => (
                    <WarehouseViewPanel
                      key={revision}
                      business={business}
                      locations={locations}
                      warehouseId={warehouseId}
                    />
                  )
                : undefined
            }
          />
        )}
      </Tabs.Root>
    </section>
  );
}
