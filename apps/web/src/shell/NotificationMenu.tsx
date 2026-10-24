import { syncActivity } from '@inventory/api-client';
import { Progress } from '@/components/ui/Progress';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowUpRight } from 'lucide-react';
import {
  businessNotificationTitle,
  type createBusinessNotificationsClient,
} from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from '@/components/ui/Menu';
type Inbox = Awaited<ReturnType<ReturnType<typeof createBusinessNotificationsClient>['inbox']>>;
export function NotificationMenu({
  unread,
  notifications,
  reachable,
}: {
  unread: string;
  notifications: Inbox['notifications'];
  reachable: boolean;
}) {
  const activity = useSyncExternalStore(syncActivity.subscribe, syncActivity.snapshot);
  const [open, setOpen] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    navigate = useNavigate();
  function stay() {
    clearTimeout(timer.current);
  }
  function leave() {
    timer.current = setTimeout(() => setOpen(false), 250);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger asChild>
        <Button
          className="notification-button"
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread in recent page` : ''}`}
          title="Recent notifications"
          onPointerEnter={(event) => {
            if (event.pointerType !== 'touch') {
              stay();
              setOpen(true);
            }
          }}
          onPointerLeave={leave}
        >
          <Bell />
          {unread && unread !== '0' && <span className="notification-count">{unread}</span>}
        </Button>
      </MenuTrigger>
      <MenuContent
        aria-label="Recent notifications"
        className="notification-menu"
        align="end"
        onPointerEnter={stay}
        onPointerLeave={leave}
        onFocusCapture={stay}
      >
        <h2 className="notification-heading">Notifications</h2>
        {activity && (
          <div className="p-3 space-y-2">
            <p role="status">Local synchronization · {activity.progress.phase}</p>
            <Progress
              label="Server-confirmed records"
              {...(activity.progress.total
                ? { value: (100 * activity.progress.confirmed) / activity.progress.total }
                : {})}
            />
            <p className="text-sm">
              {activity.progress.confirmed} of {activity.progress.total} records confirmed
            </p>
            <MenuItem
              onSelect={() => {
                setOpen(false);
                activity.inspect();
              }}
            >
              View synchronization result
            </MenuItem>
            <MenuSeparator />
          </div>
        )}
        {!reachable ? (
          <p className="p-3 text-sm" role="status">
            Recent notifications are unavailable. Open the inbox to retry.
          </p>
        ) : !notifications.length ? (
          <p className="p-3 text-sm">No recent notifications.</p>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <MenuItem key={n.id} onSelect={() => void navigate('/notifications')}>
              <span>
                <strong>{businessNotificationTitle(n.event)}</strong>
                <small className="block text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                  {!n.readAt ? ' · Unread' : ''}
                </small>
              </span>
            </MenuItem>
          ))
        )}
        <MenuSeparator />
        <MenuItem onSelect={() => void navigate('/notifications')}>
          <ArrowUpRight className="notification-view-all-icon" aria-hidden="true" />
          View all notifications
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
