import { CashPanel } from './CashPanel';
import { ReceiptPanel } from './ReceiptPanel';
import { hasPermission } from '@inventory/contracts';
import { useState } from 'react';
import type { Business, Location } from '@inventory/contracts';
import { PosCheckout } from './PosCheckout';
import { View, Text } from 'react-native';
import { Action, Choice } from '../organization/Controls';
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
    <View>
      <Action label="Back to management" disabled={locked} onPress={close} />
      <Choice
        label="Checkout warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={setWarehouseId}
        disabled={locked}
      />
      <Action
        label="Cash shifts / sale history"
        onPress={() => setTools(!tools)}
        disabled={false}
      />
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
        <Text>
          Checkout requires an active warehouse and sale permission. History remains available.
        </Text>
      )}
    </View>
  );
}
