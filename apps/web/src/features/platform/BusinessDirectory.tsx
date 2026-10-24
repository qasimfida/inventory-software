import { Fragment, useState } from 'react';
import type { Location, PlatformBusiness } from '@inventory/contracts';
import { ChevronDown, ChevronRight, Building2, Store, Warehouse } from 'lucide-react';
import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormSheet } from '@/components/common/FormSheet';
import { BusinessLocations } from './BusinessLocations';
export function BusinessDirectory({
  items,
  grid,
  onManage,
}: {
  items: PlatformBusiness[];
  grid: boolean;
  onManage?: (businessId: string, location: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<{
    business: PlatformBusiness;
    location?: Location;
  } | null>(null);
  function toggle(id: string) {
    setExpanded((old) => (old.includes(id) ? old.filter((value) => value !== id) : [...old, id]));
  }
  const details = (business: PlatformBusiness) => (
    <Button variant="ghost" onClick={() => setSelected({ business })}>
      <Building2 aria-hidden="true" />
      {business.name}
    </Button>
  );
  const expansion = (business: PlatformBusiness) => (
    <Button
      variant="ghost"
      size="icon"
      aria-expanded={expanded.includes(business.id)}
      aria-label={`${expanded.includes(business.id) ? 'Hide' : 'Show'} locations for ${business.name}`}
      onClick={() => toggle(business.id)}
    >
      {expanded.includes(business.id) ? <ChevronDown /> : <ChevronRight />}
    </Button>
  );
  const locations = (business: PlatformBusiness) => (
    <BusinessLocations
      business={business}
      grid={grid}
      onOpen={(location) => setSelected({ business, location })}
    />
  );
  return (
    <>
      {grid ? (
        <div className="inventory-product-grid">
          {items.map((business) => (
            <article key={business.id} className="inventory-product-card">
              <div className="business-card-art" aria-hidden="true">
                <Building2 data-icon-size="large" />
              </div>
              {details(business)}
              <StatusBadge tone={business.state === 'active' ? 'success' : 'warning'}>
                {business.state}
              </StatusBadge>
              <p>{business.createdAt.slice(0, 10)} UTC</p>
              <div className="business-card-counts">
                <span>
                  <Store />
                  {business.storeCount ?? '—'} stores
                </span>
                <span>
                  <Warehouse />
                  {business.warehouseCount ?? '—'} warehouses
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelected({ business });
                }}
              >
                View locations
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <TableScroll label="Registered businesses">
          <Table>
            <thead>
              <tr>
                <th>Locations</th>
                <th>Business</th>
                <th>Stores</th>
                <th>Warehouses</th>
                <th>Status</th>
                <th>Registered (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((business) => (
                <Fragment key={business.id}>
                  <tr onClick={() => toggle(business.id)}>
                    <td onClick={(e) => e.stopPropagation()}>{expansion(business)}</td>
                    <th scope="row" onClick={(e) => e.stopPropagation()}>
                      {details(business)}
                    </th>
                    <td data-numeric>{business.storeCount ?? '—'}</td>
                    <td data-numeric>{business.warehouseCount ?? '—'}</td>
                    <td>
                      <StatusBadge tone={business.state === 'active' ? 'success' : 'warning'}>
                        {business.state}
                      </StatusBadge>
                    </td>
                    <td>{business.createdAt.slice(0, 10)}</td>
                  </tr>
                  {expanded.includes(business.id) && (
                    <tr>
                      <td colSpan={6}>{locations(business)}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      <FormSheet
        title={selected?.location ? 'Location details' : 'Business details'}
        description="Registered information. Changes are managed in the authorized business workspace."
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <div>
            {onManage && (
              <Button onClick={() => onManage?.(selected.business.id, !!selected.location)}>
                Manage in business workspace
              </Button>
            )}
            <dl className="record-details">
              <dt>Name</dt>
              <dd>{selected.location?.name ?? selected.business.name}</dd>
              <dt>Status</dt>
              <dd>{selected.location?.state ?? selected.business.state}</dd>
              <dt>Business</dt>
              <dd>{selected.business.name}</dd>
              <dt>Time zone</dt>
              <dd>{selected.business.timeZone}</dd>
              {selected.location ? (
                <>
                  <dt>Code</dt>
                  <dd>{selected.location.code}</dd>
                  <dt>Type</dt>
                  <dd>{selected.location.type}</dd>
                  <dt>Store reference</dt>
                  <dd className="break-all">{selected.location.storeId ?? 'This is a store'}</dd>
                </>
              ) : (
                <>
                  <dt>Registered (UTC)</dt>
                  <dd>{selected.business.createdAt}</dd>
                </>
              )}
            </dl>
            {grid && !selected.location && locations(selected.business)}
          </div>
        )}
      </FormSheet>
    </>
  );
}
