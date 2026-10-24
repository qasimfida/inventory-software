import { workspaceRoutes } from '@inventory/api-client';
import { PageTitleContext } from '@/components/common/ScreenHeader';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/Drawer';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarResizeHandle } from './SidebarResizeHandle';
import { SearchPalette } from './SearchPalette';
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(248);
  const location = useLocation(),
    content = useRef<HTMLElement>(null);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);
  useEffect(() => {
    content.current?.focus();
  }, [location.pathname]);
  return (
    <div
      className="application-shell"
      data-collapsed={collapsed}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <a
        onClick={(event) => {
          event.preventDefault();
          content.current?.focus();
        }}
        href="#page-content"
        className="sr-only focus:not-sr-only"
      >
        Skip to page content
      </a>
      <div className="desktop-sidebar">
        <Sidebar collapsed={collapsed} close={() => setMobileOpen(false)} />
        {!collapsed && <SidebarResizeHandle width={sidebarWidth} onChange={setSidebarWidth} />}
      </div>
      <Drawer direction="left" open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className="navigation-drawer">
          <DrawerTitle className="sr-only">Navigation</DrawerTitle>
          <DrawerDescription className="sr-only">Choose a workspace page.</DrawerDescription>
          <Sidebar collapsed={false} close={() => setMobileOpen(false)} />
          <Button className="sr-only focus:not-sr-only" onClick={() => setMobileOpen(false)}>
            Close navigation
          </Button>
        </DrawerContent>
      </Drawer>
      <Button
        className="sidebar-edge-toggle desktop-sidebar-toggle"
        variant="outline"
        size="icon"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
      </Button>
      <div className="shell-main">
        <Header onMenu={() => setMobileOpen(true)} />
        <main className="shell-content" id="page-content" ref={content} tabIndex={-1}>
          <PageTitleContext.Provider
            value={workspaceRoutes.find((r) => r.path === location.pathname)?.title ?? ''}
          >
            {children}
          </PageTitleContext.Provider>
        </main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
