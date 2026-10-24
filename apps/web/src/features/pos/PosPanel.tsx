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
}: {
  business: Business;
  locations: Location[];
  close: () => void;
  showBack?: boolean;
  onLockChange?: (locked: boolean) => void;
}) {
  const online = useReachability();
  const preferences = useAppearance().preferences;
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
      <div className="pos-toolbar">
        {showBack && (
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
        )}
      </div>
      <Button
        variant="outline"
        aria-pressed={cached}
        disabled={locked}
        onClick={() => setCached(!cached)}
      >
        {cached ? 'Use live checkout' : 'Use cached products'}
      </Button>
      {warehouse && warehouse.state === 'active' && hasPermission(business, 'sales.write') ? (
        cached ? (
          <OfflinePanel
            embedded
            setup={{
              businessId: business.id,
              warehouseId: warehouse.id,
              currency: preferences.currency,
            }}
            onLockChange={setLocked}
          />
        ) : (
          <PosCheckout
            key={warehouse.id}
            business={business}
            warehouse={warehouse}
            onLockChange={setLocked}
          />
        )
      ) : (
        <p>Checkout requires an active warehouse and sale permission. History remains available.</p>
      )}
    </div>
  );
}
