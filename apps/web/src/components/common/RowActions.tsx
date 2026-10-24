import { EllipsisVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../ui/Menu';
/** Callers supply only authorized actions; backend permissions remain authoritative. */
export function RowActions({
  label,
  actions,
}: {
  label: string;
  actions: readonly { label: string; icon?: ReactNode; disabled?: boolean; onSelect: () => void }[];
}) {
  if (!actions.length) return null;
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button data-row-actions variant="ghost" size="icon" aria-label={`Actions for ${label}`}>
          <EllipsisVertical />
        </Button>
      </MenuTrigger>
      <MenuContent align="end" aria-label={`Actions for ${label}`}>
        {actions.map((action) => (
          <MenuItem key={action.label} disabled={action.disabled} onSelect={action.onSelect}>
            {action.icon}
            {action.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
