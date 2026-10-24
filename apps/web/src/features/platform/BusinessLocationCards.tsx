import type { Location } from '@inventory/contracts';
import { Store, Warehouse, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import './business-locations.css';
/** Grid details use location cards; table expansion keeps its compact nested table. */
export function BusinessLocationCards({
  locations,
  onOpen,
}: {
  locations: Location[];
  onOpen: (location: Location) => void;
}) {
  return (
    <div className="business-location-groups">
      {(['stores', 'warehouses'] as const).map((kind) => {
        const items = locations.filter((location) => location.kind === kind);
        if (!items.length) return null;
        const Icon = kind === 'stores' ? Store : Warehouse;
        return (
          <section key={kind} aria-label={kind === 'stores' ? 'Stores and branches' : 'Warehouses'}>
            <h4>{kind === 'stores' ? 'Stores & branches' : 'Warehouses'}</h4>
            <ul className="business-location-cards">
              {items.map((location) => (
                <li key={location.id}>
                  <Icon aria-hidden="true" />
                  <Button variant="ghost" onClick={() => onOpen(location)}>
                    {location.name}
                    <ArrowUpRight aria-hidden="true" />
                  </Button>
                  <p>
                    {location.type === 'branch'
                      ? 'Branch'
                      : kind === 'stores'
                        ? 'Store'
                        : 'Warehouse'}{' '}
                    · {location.code}
                  </p>
                  <StatusBadge tone={location.state === 'active' ? 'success' : 'warning'}>
                    {location.state}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
