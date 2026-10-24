import { loadDesktopLinks } from '@/platform/desktop-links';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAuthLink } from '@inventory/api-client';
import { pendingAuthLink } from '@/features/auth/link-state';
/** Native links are parsed as credentials, never as arbitrary navigation instructions. */
export function DesktopLinks() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    let disposed = false,
      stop: (() => void) | undefined;
    const receive = (urls: string[]) => {
      if (disposed) return;
      for (const url of urls) {
        if (url === 'inventory://offline' || url === 'inventory://offline/') {
          void navigate('/offline');
          break;
        }
        const link = parseAuthLink(url, import.meta.env.VITE_APP_ORIGIN);
        if (link) {
          pendingAuthLink.set(link);
          void navigate(`/auth/${link.kind}`, { replace: true, state: { receivedAt: Date.now() } });
          break;
        }
      }
    };
    void loadDesktopLinks()
      .then(async (plugin) => {
        const unsubscribe = await plugin.onOpenUrl(receive);
        if (disposed) {
          unsubscribe();
          return;
        }
        stop = unsubscribe;
        const urls = await plugin.getCurrent();
        if (urls) receive(urls);
      })
      .catch(() => {
        /* Browser/dev shells without the plugin retain manual code entry. Never log links. */
      });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [navigate]);
  return null;
}
