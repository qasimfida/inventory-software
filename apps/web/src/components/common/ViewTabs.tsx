import { Hint } from '@/components/ui/Tooltip';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutGrid, List } from 'lucide-react';
/** Controlled presentation choice; does not fetch, sort, or mutate records. */
export function ViewTabs({
  value,
  onChange,
  label = 'View',
  panelId,
}: {
  value: 'list' | 'grid';
  onChange: (value: 'list' | 'grid') => void;
  label?: string;
  panelId: string;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => {
        if (next === 'list' || next === 'grid') onChange(next);
      }}
    >
      <Tabs.List className="view-tabs" aria-label={label}>
        <Hint label="List view">
          <Tabs.Trigger aria-controls={panelId} value="list" aria-label={`${label} list view`}>
            <List />
            List
          </Tabs.Trigger>
        </Hint>
        <Hint label="Grid view">
          <Tabs.Trigger aria-controls={panelId} value="grid" aria-label={`${label} grid view`}>
            <LayoutGrid />
            Grid
          </Tabs.Trigger>
        </Hint>
      </Tabs.List>
    </Tabs.Root>
  );
}
