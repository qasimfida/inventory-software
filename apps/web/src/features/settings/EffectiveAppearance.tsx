import { useEffect, useState } from 'react';
import { useAppearance } from '@/theme/Appearance';
/** Describes device constraints without writing them back to account preferences. */
export function EffectiveAppearance() {
  const { preferences } = useAppearance();
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media?.matches ?? false);
    update();
    media?.addEventListener('change', update);
    return () => media?.removeEventListener('change', update);
  }, []);
  return (
    <p className="text-sm text-muted-foreground" role="status">
      Current display: {preferences.density} density · {preferences.controlSize} controls ·{' '}
      {reduced ? 'off' : preferences.animation} animation · {preferences.charts} charts.
      {reduced &&
        ' Your device’s reduced-motion setting disables animation; your saved choice is unchanged.'}
    </p>
  );
}
