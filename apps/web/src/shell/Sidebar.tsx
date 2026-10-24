import { Hint } from '@/components/ui/Tooltip';
import { useState } from 'react';
import { AccordionSection } from '@/components/ui/Accordion';
import { Link, NavLink } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { availableRoutes } from '@inventory/api-client';
import { useWorkspace } from './WorkspaceContext';
import { ProfileMenu } from './ProfileMenu';
import { routeIcons } from './route-icons';
export function Sidebar({ collapsed, close }: { collapsed: boolean; close: () => void }) {
  const { business } = useWorkspace();
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const routes = availableRoutes(business);
  const groups = [...new Set(routes.map((r) => r.group))];
  return (
    <aside className="app-sidebar" data-collapsed={collapsed} aria-label="Application sidebar">
      <div className="sidebar-brand">
        <Link to="/dashboard" onClick={close} aria-label="Inventory home">
          <Boxes aria-hidden="true" />
          {!collapsed && <strong>Inventory</strong>}
        </Link>
      </div>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        {groups.map((group) => {
          const items = routes.filter((r) => r.group === group);
          const links = items.map((route) => {
            const Icon = routeIcons[route.path] ?? Boxes;
            return (
              <Hint key={route.path} label={route.title}>
                <NavLink
                  to={route.path}
                  className="shell-nav-link"
                  aria-label={collapsed ? route.title : undefined}
                  onClick={close}
                >
                  <Icon aria-hidden="true" />
                  {!collapsed && <span>{route.title}</span>}
                </NavLink>
              </Hint>
            );
          });
          return (
            <AccordionSection
              key={group}
              title={group}
              open={collapsed || !closedGroups.includes(group)}
              onOpenChange={(open) => {
                if (!collapsed)
                  setClosedGroups((old) =>
                    open ? old.filter((v) => v !== group) : [...new Set([...old, group])],
                  );
              }}
              className={collapsed ? 'sidebar-group collapsed-group' : 'sidebar-group'}
            >
              {links}
            </AccordionSection>
          );
        })}
      </nav>
      <div className="sidebar-profile">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
