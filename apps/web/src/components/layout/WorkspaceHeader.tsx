import { Boxes, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
export function WorkspaceHeader({
  onSettings,
  settingsOpen,
}: {
  onSettings: () => void;
  settingsOpen: boolean;
}) {
  return (
    <header className="workspace-header">
      <div className="flex items-center gap-3">
        <Boxes aria-hidden="true" className="size-7 text-primary" />
        <div>
          <h1 className="text-xl">Inventory</h1>
          <p className="text-xs text-muted-foreground">Business workspace</p>
        </div>
      </div>
      <Button variant="ghost" onClick={onSettings} aria-pressed={settingsOpen}>
        <Settings aria-hidden="true" />
        {settingsOpen ? 'Back to workspace' : 'Settings'}
      </Button>
    </header>
  );
}
