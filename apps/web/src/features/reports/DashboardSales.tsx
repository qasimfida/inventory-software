import { ArrowUpRight, Package, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Business, DashboardSnapshot } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { dashboardGrowth } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/common/AsyncState';
import { DashboardTrend } from './DashboardTrend';
export function DashboardSales({
  data,
  business,
}: {
  data: DashboardSnapshot;
  business: Business;
}) {
  const sales = data.sales!;
  const money = (v: string) => formatMinorUnits(v, data.currency),
    growth = dashboardGrowth(sales.periodMinor, sales.previousMinor);
  const comparisonTotal = BigInt(sales.periodMinor) + BigInt(sales.previousMinor);
  const share =
    growth !== null && comparisonTotal
      ? Number((BigInt(sales.periodMinor) * 10000n) / comparisonTotal) / 100
      : 0;
  return (
    <>
      <section className="overview-panel overview-recent" aria-label="Quick POS">
        <div className="overview-panel-heading">
          <div>
            <h3>Quick POS</h3>
            <p>Recent confirmed sales · {data.currency}</p>
          </div>
          {hasPermission(business, 'sales.write') && (
            <Link
              to="/pos"
              className="overview-icon-link"
              aria-label="Open point of sale"
              title="Open point of sale"
            >
              <Plus />
            </Link>
          )}
        </div>
        {!sales.recent.length ? (
          <EmptyState message={`No sales in ${data.currency} during this period.`} />
        ) : (
          <div className="overview-recent-grid">
            {sales.recent.slice(0, 2).map((sale) => (
              <Link key={sale.id} to="/sales" className="overview-sale">
                <div className="overview-sale-heading">
                  <Package aria-hidden="true" />
                  <StatusBadge
                    tone={
                      sale.state === 'completed'
                        ? 'success'
                        : sale.state === 'voided'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {sale.state.replaceAll('_', ' ')}
                  </StatusBadge>
                </div>
                <strong>{sale.name}</strong>
                <span className="text-muted-foreground">
                  {sale.sku} · {sale.lines} line{sale.lines === '1' ? '' : 's'}
                </span>
                <span className="overview-sale-total">{money(sale.totalMinor)}</span>
                <time dateTime={sale.createdAt}>{sale.createdAt.slice(0, 10)} UTC</time>
              </Link>
            ))}
          </div>
        )}
        <div className="overview-summary">
          <div>
            <span>Period orders</span>
            <strong>{sales.periodOrders}</strong>
          </div>
          <div>
            <span>Gross sales</span>
            <strong>{money(sales.periodMinor)}</strong>
          </div>
        </div>
      </section>
      <DashboardTrend data={data} />
      <section className="overview-panel overview-growth" aria-label="Sales growth">
        <div className="overview-panel-heading">
          <div>
            <h3>Growth</h3>
            <p>Against the previous {sales.trend.length} UTC days</p>
          </div>
        </div>
        <svg viewBox="0 0 120 65" className="overview-growth-chart" aria-hidden="true">
          <path d="M 10 60 A 50 50 0 0 1 110 60" pathLength="100" />
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            pathLength="100"
            strokeDasharray={`${share} 100`}
          />
        </svg>
        <p className="overview-growth-value">{growth ?? '—'}</p>
        <p>{growth ? 'Gross sales change' : 'No prior-period comparison'}</p>
        <dl className="overview-comparison">
          <dt>Current period</dt>
          <dd>{money(sales.periodMinor)}</dd>
          <dt>Previous period</dt>
          <dd>{money(sales.previousMinor)}</dd>
        </dl>
      </section>
      <section className="overview-panel overview-top" aria-label="Top products">
        <div className="overview-panel-heading">
          <div>
            <h3>Top products</h3>
            <p>By gross sales in this period</p>
          </div>
          <Link
            to="/sales"
            title="Open sales"
            aria-label="Open sales"
            className="overview-icon-link"
          >
            <ArrowUpRight />
          </Link>
        </div>
        {!sales.topProducts.length ? (
          <EmptyState message="No product sales in this currency." />
        ) : (
          <ol className="overview-top-list">
            {sales.topProducts.map((p) => (
              <li key={p.id}>
                <Package aria-hidden="true" />
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.sku}</span>
                </div>
                <strong>{money(p.totalMinor)}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
