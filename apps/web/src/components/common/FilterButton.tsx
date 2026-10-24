import type { ComponentProps } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
/** Parents supply only applied, human-readable filters. */
export function FilterButton({
  active,
  ...props
}: ComponentProps<typeof Button> & { active: string[] }) {
  return (
    <Button
      variant="outline"
      {...props}
      title={active.length ? active.join(' · ') : 'No filters selected'}
    >
      <SlidersHorizontal />
      Filters
      {active.length > 0 && (
        <span className="filter-count" aria-label={`${active.length} active filters`}>
          {active.length}
        </span>
      )}
    </Button>
  );
}
