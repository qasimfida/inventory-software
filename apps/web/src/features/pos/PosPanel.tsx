import { settingsModel } from '@/platform/settings';
import { useReachability } from '@/platform/useReachability';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { OfflinePanel } from '../offline/OfflinePanel';
import { useAppearance } from '@/theme/Appearance';
import { ArrowLeft, Info } from 'lucide-react';
import { Hint } from '@/components/ui/Tooltip';
import { hasPermission } from '@inventory/contracts';
import { useEffect, useState } from 'react';
import type { Business, Location } from '@inventory/contracts';
import { PosCheckout } from './PosCheckout';
import { Button } from '@/components/ui/Button';
export function PosPanel({
  business,
  locations,
  close,
  onLockChange,
  showBack = true,
  active = true,
}: {
  business: Business;
  locations: Location[];
  close: () => void;
  showBack?: boolean;
  active?: boolean;
  onLockChange?: (locked: boolean) => void;
}) {
  const online = useReachability();
  useAppearance();
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
    <div className="space-y-4">
      <ScreenHeader
        title="Point of sale"
        actions={
          <>
            <Hint label="Online cash and authorized credit. Amounts use currency minor units. Review quoted totals and confirm cash actually received. After reload or session lock, inspect sale history before retrying an uncertain sale.">
              <Button variant="ghost" size="icon" aria-label="Payment guidance">
                <Info />
              </Button>
            </Hint>
          </>
        }
        description="Find products, review your cart and confirm payment."
      />
      {!online && (
        <p role="status">
          Connection unavailable. Cached cash checkout requires a prepared, unlocked register. Any
          live cart is retained until cleared or connectivity returns.
        </p>
      )}
      {showBack && (
        <div className="pos-toolbar">
          <Button
            disabled={locked}
            onClick={close}
            variant="ghost"
            size="icon"
            aria-label="Back to management"
            title="Back to management"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
        </div>
      )}
      {cached && online && (
        <Button variant="outline" disabled={locked} onClick={() => setCached(false)}>
          Return to live checkout
        </Button>
      )}
      {warehouse && warehouse.state === 'active' && hasPermission(business, 'sales.write') ? (
        cached ? (
          <OfflinePanel
            embedded
            setup={{
              businessId: business.id,
              warehouseId: warehouse.id,
              currency: settingsModel.transactionCurrency(),
            }}
            onLockChange={setLocked}
          />
        ) : (
          <PosCheckout
            active={active}
            key={warehouse.id}
            business={business}
            warehouse={warehouse}
            locations={locations}
            onLockChange={setLocked}
          />
        )
      ) : (
        <p>Checkout requires an active warehouse and sale permission. History remains available.</p>
      )}
    </div>
  );
}
