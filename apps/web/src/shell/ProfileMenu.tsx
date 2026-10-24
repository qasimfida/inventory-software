import { availableRoutes } from '@inventory/api-client';
import { ThemeMenu } from '@/theme/ThemeMenu';
import {
  ChevronsUpDown,
  UserRound,
  Building2,
  SlidersHorizontal,
  LogOut,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { useState } from 'react';
import { OfflinePanel } from '@/features/offline/OfflinePanel';
import { authClient } from '@/platform/auth-client';
import { lockOffline } from '@/features/offline/offline-lock';
import { useAccount } from './SessionContext';
import { ProfileIdentity } from './ProfileIdentity';
import { useWorkspace } from './WorkspaceContext';
export function ProfileMenu({ collapsed, top = false }: { collapsed: boolean; top?: boolean }) {
  const [preferences, setPreferences] = useState(false);
  const [offline, setOffline] = useState(false);
  const { session, busy, run } = useAccount();
  const { business } = useWorkspace();
  const navigate = useNavigate();
  return (
    <>
      <div className={top ? undefined : 'flex min-w-0 items-center'}>
        <Menu>
          <MenuTrigger asChild>
            <Button
              variant="ghost"
              className={top ? undefined : 'profile-trigger min-w-0 flex-1'}
              size="default"
              aria-label="Open profile menu"
            >
              <ProfileIdentity
                email={session?.user.email ?? ''}
                role={business?.role ?? 'Account'}
                compact={collapsed && !top}
              />
              {!top && !collapsed && (
                <ChevronsUpDown className="profile-chevron size-5" aria-hidden="true" />
              )}
            </Button>
          </MenuTrigger>
          <MenuContent
            side={top ? 'bottom' : 'top'}
            align={top ? 'end' : 'start'}
            aria-label="Profile menu"
            className="profile-menu"
          >
            <div className="space-y-1 px-3 py-2">
              <ProfileIdentity
                email={session?.user.email ?? ''}
                role={business?.role ?? 'Account'}
              />
              <p className="text-xs text-muted-foreground">
                {business?.name ?? 'No active business'}
              </p>
            </div>
            <MenuSeparator />
            <MenuItem
              onSelect={() => {
                void navigate('/settings/profile');
              }}
            >
              <Settings aria-hidden="true" /> Settings
            </MenuItem>
            {availableRoutes(business).some((r) => r.path === '/settings/business') && (
              <MenuItem
                onSelect={() => {
                  void navigate('/settings/business');
                }}
              >
                <Building2 aria-hidden="true" /> Business settings
              </MenuItem>
            )}
            <MenuItem
              onSelect={() => {
                void navigate('/settings/profile');
              }}
            >
              <UserRound aria-hidden="true" /> Profile
            </MenuItem>
            <MenuItem
              onSelect={() => {
                setPreferences(true);
              }}
            >
              <SlidersHorizontal aria-hidden="true" /> Preferences
            </MenuItem>
            <MenuSeparator />
            <ThemeMenu side="right" menuItem />
            <div className="px-3 py-2">
              <Switch
                label="Switch to offline register"
                checked={offline}
                onCheckedChange={setOffline}
                description="Unlock a previously prepared register; grants and expiry still apply."
              />
            </div>
            <MenuSeparator />
            <MenuItem
              disabled={busy}
              onSelect={() =>
                void run(async () => {
                  lockOffline();
                  await authClient.logout();
                  return null;
                })
              }
            >
              <LogOut aria-hidden="true" /> Sign out
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <Dialog open={preferences} onOpenChange={setPreferences}>
        <DialogContent className="preferences-dialog">
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Appearance and performance for your account.</DialogDescription>
          <SettingsPanel preferencesOnly />
          <Button variant="outline" onClick={() => setPreferences(false)}>
            Close preferences
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={offline} onOpenChange={setOffline}>
        <DialogContent>
          <DialogTitle>Offline register</DialogTitle>
          <DialogDescription>
            Unlock your prepared register. Locally saved sales remain pending until synchronization
            succeeds.
          </DialogDescription>
          <OfflinePanel allowSetup={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}
