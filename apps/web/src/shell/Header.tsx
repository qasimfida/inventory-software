import { productDetailId } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { useHeaderHeight } from './useHeaderHeight';
import { ConnectionStatus } from './ConnectionStatus';
import { NotificationMenu } from './NotificationMenu';
import { HeaderSearch } from './HeaderSearch';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import {
  createBusinessNotificationsClient,
  workspaceRoutes,
  overviewDestination,
} from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { authClient } from '@/platform/auth-client';
import { useWorkspace } from './WorkspaceContext';
export function Header({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const headerRef = useHeaderHeight();
  const { business, locked, state, selection, setSelection, locations } = useWorkspace();
  const warehouses =
    state.workspace?.locations.filter(
      (item) => item.kind === 'warehouses' && item.state === 'active',
    ) ?? [];
  const location = useLocation();
  const route = workspaceRoutes.find((r) => r.path === location.pathname);
  const rootPath = overviewDestination(business, location.pathname === '/admin');
  const title =
    route?.title ??
    (productDetailId(location.pathname)
      ? 'Product details'
      : location.pathname === '/admin'
        ? 'Platform overview'
        : location.pathname === '/admin/businesses'
          ? 'Registered businesses'
          : 'Workspace');
  const [online, setOnline] = useState(navigator.onLine);
  const [inbox, setInbox] = useState<{
    id: string;
    unread: string;
    reachable: boolean;
    notifications: Awaited<
      ReturnType<ReturnType<typeof createBusinessNotificationsClient>['inbox']>
    >['notifications'];
  }>({ id: '', unread: '', reachable: false, notifications: [] });
  const unread = inbox.id === business?.id ? inbox.unread : '';
  const reachable = online && inbox.id === business?.id && inbox.reachable;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!business || business.state !== 'active') return;
    const client = createBusinessNotificationsClient(authClient.organizationRequest, business.id);
    const refresh = async () => {
      try {
        const page = await client.inbox();
        if (!cancelled)
          setInbox({
            id: business.id,
            unread:
              String(page.notifications.filter((n) => !n.readAt).length) +
              (page.nextCursor ? '+' : ''),
            reachable: true,
            notifications: page.notifications,
          });
      } catch {
        if (!cancelled)
          setInbox({ id: business.id, unread: '', reachable: false, notifications: [] });
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [business, location.pathname]);
  return (
    <header ref={headerRef} className="app-header">
      <div className="header-title">
        {location.pathname.split('/').filter(Boolean).length > 1 &&
          location.pathname !== rootPath && (
            <Button
              variant="ghost"
              size="icon"
              disabled={locked}
              title="Go back"
              aria-label="Go back"
              onClick={() => {
                if (window.history.state?.idx > 0) void navigate(-1);
                else void navigate(rootPath);
              }}
            >
              <ArrowLeft />
            </Button>
          )}
        <h1>{title}</h1>
        <Button
          className="mobile-menu-trigger"
          variant="ghost"
          size="icon"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
        {business && hasPermission(business, 'locations.read') && warehouses.length > 0 && (
          <WarehouseSelect
            label={
              ['/pos', '/cash', '/sales'].includes(location.pathname)
                ? 'Checkout warehouse'
                : 'Workspace warehouse'
            }
            value={
              selection.length === 1 && warehouses.some((w) => w.id === selection[0])
                ? selection[0]
                : ['/pos', '/cash', '/sales'].includes(location.pathname)
                  ? (locations.find((w) => w.kind === 'warehouses' && w.state === 'active')?.id ??
                    '')
                  : ''
            }
            disabled={locked || warehouses.length === 1}
            onChange={(event) => setSelection(event.target.value ? [event.target.value] : [])}
          >
            {!['/pos', '/cash', '/sales'].includes(location.pathname) && (
              <option value="">
                {warehouses.length === 1 ? warehouses[0]?.name : 'All permitted warehouses'}
              </option>
            )}
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </WarehouseSelect>
        )}
      </div>
      <div className="header-actions">
        <HeaderSearch />
        <span className="header-separator" aria-hidden="true" />
        <ConnectionStatus reachable={reachable} />
        <span className="header-separator" aria-hidden="true" />
        <div className="header-theme">
          <ThemeToggle />
        </div>
        <span className="header-separator" aria-hidden="true" />
        <NotificationMenu
          key={business?.id ?? 'none'}
          unread={unread}
          reachable={reachable}
          notifications={inbox.id === business?.id ? inbox.notifications : []}
        />
      </div>
    </header>
  );
}
