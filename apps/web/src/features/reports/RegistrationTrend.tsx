import { useId } from 'react';
import type { PlatformOverview } from '@inventory/contracts';
import { dashboardHeights } from '@inventory/api-client';
export function RegistrationTrend({ rows }: { rows: PlatformOverview['registrations'] }) {
  const id = useId();
  const heights = dashboardHeights(rows.map((r) => r.count));
  const points = heights
    .map((h, i) => `${10 + (i * 580) / Math.max(1, rows.length - 1)},${170 - h * 1.5}`)
    .join(' ');
  return (
    <section className="overview-panel" aria-label="Business registrations trend">
      <div className="overview-panel-heading">
        <h2>Business registrations</h2>
        <span>Last 30 days · UTC</span>
      </div>
      {rows.length ? (
        <>
          <svg viewBox="0 0 600 190" className="overview-chart" role="img" aria-labelledby={id}>
            <title id={id}>
              Daily business registrations.{' '}
              {rows.map((row) => `${row.date}: ${row.count}`).join('; ')}
            </title>
            {[20, 70, 120, 170].map((y) => (
              <line key={y} x1="10" x2="590" y1={y} y2={y} className="overview-chart-grid" />
            ))}
            <polygon points={`10,170 ${points} 590,170`} className="overview-chart-area" />
            <polyline points={points} className="overview-chart-line" />
          </svg>
          <div className="overview-chart-labels">
            <span>{rows[0]?.date}</span>
            <span>{rows.at(-1)?.date}</span>
          </div>
        </>
      ) : (
        <p>No registration history available.</p>
      )}
    </section>
  );
}
