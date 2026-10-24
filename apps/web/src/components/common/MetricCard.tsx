import type { ReactNode } from 'react';
export function MetricCard({
  label,
  value,
  unit,
  primary = false,
}: {
  label: string;
  value: ReactNode;
  unit: string;
  primary?: boolean;
}) {
  return (
    <div className={`metric-card ${primary ? 'metric-primary' : ''}`}>
      <p className="text-sm">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="text-xs">{unit}</p>
    </div>
  );
}
