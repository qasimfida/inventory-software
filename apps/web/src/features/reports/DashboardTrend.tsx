import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { ChartPresentation } from '@/components/common/ChartPresentation';
import { useId } from 'react';
import type { DashboardSnapshot } from '@inventory/contracts';
import { dashboardHeights } from '@inventory/api-client';

import { Table, TableScroll } from '@/components/ui/Table';
export function DashboardTrend({ data }: { data: DashboardSnapshot }) {
  const { formatMinorUnits } = useDisplayMoney();

  const id = useId(),
    sales = data.sales!;
  const heights = dashboardHeights(sales.trend.map((p) => p.totalMinor));
  const points = heights
    .map((h, i) => `${10 + (i * 580) / Math.max(1, heights.length - 1)},${170 - h * 1.5}`)
    .join(' ');
  return (
    <section className="overview-panel overview-trend" aria-label="Sales trend">
      <div className="overview-panel-heading">
        <div>
          <h3>Sales trend</h3>
          <p>
            {data.from} – {data.to} UTC
          </p>
        </div>
        <strong>{formatMinorUnits(sales.periodMinor, data.currency)}</strong>
      </div>
      <ChartPresentation
        label="Sales chart"
        values={
          <>
            <TableScroll label="Daily sales values" tabIndex={-1}>
              <Table>
                <thead>
                  <tr>
                    <th scope="col">Date (UTC)</th>
                    <th scope="col" data-numeric>
                      Gross sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.trend.map((p) => (
                    <tr key={p.date}>
                      <th scope="row">{p.date}</th>
                      <td data-numeric>{formatMinorUnits(p.totalMinor, data.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          </>
        }
      >
        <svg viewBox="0 0 600 190" role="img" aria-labelledby={id} className="overview-chart">
          <title id={id}>
            Daily gross sales in {data.currency}. Exact values are available in the accessible daily
            sales table.
          </title>
          {[20, 70, 120, 170].map((y) => (
            <line key={y} x1="10" x2="590" y1={y} y2={y} className="overview-chart-grid" />
          ))}
          <polygon points={`10,170 ${points} 590,170`} className="overview-chart-area" />
          <polyline points={points} className="overview-chart-line" />
          {sales.trend.map((point, index) => (
            <circle
              key={point.date}
              cx={10 + (index * 580) / Math.max(1, heights.length - 1)}
              cy={170 - heights[index]! * 1.5}
              r="3"
              className="fill-chart-1"
              data-date={point.date}
            >
              <title>
                {point.date}: {formatMinorUnits(point.totalMinor, data.currency)} gross sales
              </title>
            </circle>
          ))}
        </svg>
        <div className="overview-chart-labels">
          <span>{data.from}</span>
          <span>{data.to}</span>
        </div>
      </ChartPresentation>
    </section>
  );
}
