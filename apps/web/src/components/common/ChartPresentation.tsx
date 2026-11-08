import { useState, type ReactNode } from 'react';
import { useAppearance } from '@/theme/Appearance';
import { Button } from '@/components/ui/Button';
/** Changes chart prominence only; values and record actions always remain reachable. */
export function ChartPresentation({
  label,
  children,
  values,
}: {
  label: string;
  children: ReactNode;
  values: ReactNode;
}) {
  const { preferences } = useAppearance();
  const [revealed, setRevealed] = useState(false);
  const numbers = preferences.charts === 'numbers';
  return (
    <div className="chart-presentation" data-prominence={preferences.charts ?? 'balanced'}>
      {numbers && (
        <Button variant="ghost" onClick={() => setRevealed(!revealed)} aria-expanded={revealed}>
          {revealed ? 'Hide' : 'Show'} {label}
        </Button>
      )}
      {(!numbers || revealed) && children}
      <div className="chart-values" aria-label={`${label} values`}>
        {values}
      </div>
    </div>
  );
}
