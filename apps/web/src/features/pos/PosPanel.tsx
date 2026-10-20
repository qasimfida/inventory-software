import { CashPanel } from './CashPanel';
import { ReceiptPanel } from './ReceiptPanel';
import { hasPermission } from '@inventory/contracts';
import { useState } from 'react';
import type { Business, Location } from '@inventory/contracts';
import { PosCheckout } from './PosCheckout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
export function PosPanel({
  business,
  locations,
  close,
}: {
  business: Business;
  locations: Location[];
  close: () => void;
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses'),
    [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [locked, setLocked] = useState(false),
    [tools, setTools] = useState(false),
    warehouse = warehouses.find((w) => w.id === warehouseId);
  return (
    <div>
      <Button disabled={locked} onClick={close}>
        Back to management
      </Button>
      <label htmlFor="pos-warehouse">Checkout warehouse</label>
      <Select
        id="pos-warehouse"
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
        disabled={locked}
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </Select>
      <Button onClick={() => setTools(!tools)} disabled={false}>
        Cash shifts / sale history
      </Button>
      {warehouse && tools && (
        <>
          {hasPermission(business, 'payments.read') && (
            <CashPanel business={business} warehouseId={warehouse.id} locations={locations} />
          )}
          {hasPermission(business, 'sales.read') && (
            <ReceiptPanel business={business} warehouseId={warehouse.id} />
          )}
        </>
      )}
      {warehouse && warehouse.state === 'active' && hasPermission(business, 'sales.write') ? (
        <PosCheckout
          key={warehouse.id}
          business={business}
          warehouse={warehouse}
          onLockChange={setLocked}
        />
      ) : (
        <p>Checkout requires an active warehouse and sale permission. History remains available.</p>
      )}
    </div>
  );
}
