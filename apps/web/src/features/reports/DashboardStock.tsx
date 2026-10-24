import { ArrowUpRight, ShoppingBag, ShoppingCart, Package, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSnapshot } from '@inventory/contracts';
import { formatMinorUnits } from '@inventory/domain';
import { dashboardGrowth } from '@inventory/api-client';
import { MetricCard } from '@/components/common/MetricCard';
import { Table, TableScroll } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/common/AsyncState';
export function DashboardMetrics({ data }: { data: DashboardSnapshot }) {
  const sales = data.sales,
    stock = data.inventory;
  const money = (value: string) => formatMinorUnits(value, data.currency);
  const growth = sales ? dashboardGrowth(sales.todayMinor, sales.yesterdayMinor) : null;
  return (
    <div className="overview-metrics">
      {sales && (
        <>
          <div className="overview-metric overview-metric-primary">
            <Wallet aria-hidden="true" />
            <MetricCard
              label="Sales today"
              value={money(sales.todayMinor)}
              unit={
                growth
                  ? `${growth} vs yesterday · gross sales`
                  : 'Gross sales · no prior-day comparison'
              }
              primary
            />
          </div>
          <div className="overview-metric overview-metric-orders">
            <ShoppingBag aria-hidden="true" />
            <MetricCard
              label="Orders today"
              value={sales.todayOrders}
              unit="Confirmed sale transactions"
            />
          </div>
          <div className="overview-metric overview-metric-basket">
            <ShoppingCart aria-hidden="true" />
            <MetricCard
              label="Average basket"
              value={money(sales.averageBasketMinor)}
              unit="Today · rounded to the currency minor unit"
            />
          </div>
        </>
      )}
      {stock && (
        <Link to="/inventory?stock=low-stock" className="overview-metric overview-metric-stock">
          <Package aria-hidden="true" />
          <MetricCard
            label="Low stock"
            value={`${stock.lowStock} SKUs`}
            unit={`${stock.outOfStock} out of stock · threshold ${stock.threshold}`}
          />
        </Link>
      )}
    </div>
  );
}
export function DashboardStock({
  inventory,
}: {
  inventory: NonNullable<DashboardSnapshot['inventory']>;
}) {
  return (
    <section className="overview-panel overview-stock" aria-label="Inventory snapshot">
      <div className="overview-panel-heading">
        <div>
          <h3>Inventory snapshot</h3>
          <p>Available units across your authorized warehouses.</p>
        </div>
        <Link
          className="overview-icon-link"
          to="/inventory"
          aria-label="Open inventory"
          title="Open inventory"
        >
          <ArrowUpRight />
        </Link>
      </div>
      {!inventory.items.length ? (
        <EmptyState message="No active inventory products." />
      ) : (
        <TableScroll label="Overview inventory snapshot">
          <Table>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">SKU</th>
                <th scope="col" data-numeric>
                  Available
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.items.slice(0, 4).map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <span className="overview-product-name">
                      <Package aria-hidden="true" />
                      {item.name}
                    </span>
                  </th>
                  <td>{item.sku}</td>
                  <td data-numeric>
                    {item.available} {item.unit}
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        item.status === 'in-stock'
                          ? 'success'
                          : item.status === 'low-stock'
                            ? 'warning'
                            : 'error'
                      }
                    >
                      {item.status === 'in-stock'
                        ? 'In stock'
                        : item.status === 'low-stock'
                          ? 'Low stock'
                          : 'Out of stock'}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </section>
  );
}
