import { Hint } from '@/components/ui/Tooltip';
import { routeAllowed, workspaceRoutes } from '@inventory/api-client';
import { useWorkspace } from './WorkspaceContext';
import { Link } from 'react-router-dom';
import { CloudCheck, CloudOff } from 'lucide-react';
export function ConnectionStatus({ reachable }: { reachable: boolean }) {
  const { business } = useWorkspace();
  const device = workspaceRoutes.find((r) => r.path === '/settings/device')!;
  const label = reachable ? 'Online · server reachable' : 'Offline · server unavailable';
  const content = (
    <>
      {reachable ? <CloudCheck aria-hidden="true" /> : <CloudOff aria-hidden="true" />}
      <span className="connection-dot" data-online={reachable} aria-hidden="true" />
    </>
  );
  if (!routeAllowed(device, business))
    return (
      <Hint label={label}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Read-only status is focusable so keyboard users can inspect its tooltip. */}
        <span className="connection-indicator" role="img" tabIndex={0} aria-label={label}>
          {content}
        </span>
      </Hint>
    );
  return (
    <Hint label={label}>
      <Link className="connection-indicator" to="/settings/device" aria-label={label}>
        {content}
      </Link>
    </Hint>
  );
}
