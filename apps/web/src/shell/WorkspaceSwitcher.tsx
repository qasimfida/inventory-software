import { ProfileIdentity } from './ProfileIdentity';
import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, ChevronsUpDown, Building2, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { canSwitchWorkspace } from '@inventory/api-client';
import { settingsModel } from '@/platform/settings';
import { useWorkspace } from './WorkspaceContext';
export function WorkspaceSwitcher({
  collapsed = false,
  close,
}: {
  collapsed?: boolean;
  close: () => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { business, state, model, selection, setSelection, locked } = useWorkspace();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const locations =
    state.workspace?.locations.filter((l) => l.kind !== 'terminals' && l.state === 'active') ?? [];
  const match = (name: string) => name.toLowerCase().includes(search.toLowerCase());
  function finish(path = '/dashboard') {
    setOpen(false);
    close();
    void navigate(path);
  }
  const canSwitch = canSwitchWorkspace(business, settings.snapshot?.canManagePlatform ?? false);
  const summary = !selection.length
    ? 'All authorized locations'
    : selection.length === 1
      ? locations.find((l) => l.id === selection[0])?.name
      : `${selection.length} locations selected`;
  const identityRole = `${business?.role.replaceAll('_', ' ') ?? 'Account'} · ${summary}`;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next && canSwitch);
        if (next) {
          setSearch('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="workspace-trigger profile-trigger"
          disabled={!canSwitch}
          aria-label="Switch workspace"
          title="Switch workspace"
        >
          <ProfileIdentity
            email=""
            displayName={business?.name ?? 'Inventory'}
            role={identityRole}
            compact={collapsed}
            logo={
              settings.businessId === business?.id
                ? (settings.business?.values.company?.logo ?? '')
                : ''
            }
          />
          {!collapsed && canSwitch && (
            <ChevronsUpDown className="profile-chevron size-5" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="workspace-menu space-y-3">
        <p className="text-sm text-muted-foreground">Workspaces</p>
        <Input
          aria-label="Search workspaces and locations"
          placeholder="Search workspaces and locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {locked && (
          <p role="status">
            Finish or clear the cart before switching. Reconcile any unresolved checkout first.
          </p>
        )}
        <div className="workspace-menu-list">
          {state.businesses
            .filter((b) => match(b.name))
            .map((b) => (
              <Button
                key={b.id}
                variant="ghost"
                className="workspace-option"
                disabled={locked || state.busy || b.state !== 'active'}
                onClick={() => {
                  if (b.id === business?.id) {
                    setSelection([]);
                    finish();
                  } else
                    void model.select(b.id).then(() => {
                      if (model.snapshot().selectedId === b.id) finish();
                    });
                }}
              >
                <Building2 />
                <span>
                  {b.name}
                  <small>{b.role.replaceAll('_', ' ')}</small>
                </span>
                {b.id === business?.id && <Check />}
              </Button>
            ))}
          <hr />
          <p className="text-sm font-medium">Stores & warehouses</p>
          <Button
            variant="ghost"
            className="workspace-option"
            disabled={locked || state.busy}
            onClick={() => {
              setSelection([]);
              finish();
            }}
          >
            <Building2 />
            All authorized locations{!selection.length && <Check />}
          </Button>
          {locations
            .filter((l) => match(l.name))
            .map((l) => (
              <Button
                key={l.id}
                variant="ghost"
                className="workspace-option"
                disabled={locked || state.busy}
                onClick={() => {
                  setSelection([l.id]);
                  finish();
                }}
              >
                <Boxes />
                <span>
                  {l.name}
                  <small>
                    {l.kind === 'stores' ? 'Store' : 'Warehouse'} · {l.code}
                  </small>
                </span>
                {selection.includes(l.id) && <Check />}
              </Button>
            ))}
        </div>
        {settings.snapshot?.canManagePlatform && (
          <Button
            variant="ghost"
            disabled={locked}
            onClick={() => {
              setSelection([]);
              finish('/admin');
            }}
          >
            <ShieldCheck />
            Platform overview
          </Button>
        )}
        {state.error && <p role="alert">{state.error}</p>}
      </PopoverContent>
    </Popover>
  );
}
