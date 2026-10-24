import { useEffect, useRef } from 'react';
import type { CatalogSocket } from '@inventory/api-client';
import { catalogLive } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
function openSocket(): CatalogSocket {
  const socket = new WebSocket(authClient.catalogSocketUrl);
  const adapter: CatalogSocket = {
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    send: (data) => socket.send(data),
    close: () => socket.close(),
  };
  socket.onopen = () => adapter.onopen?.();
  socket.onmessage = (event) => adapter.onmessage?.({ data: event.data });
  socket.onclose = () => adapter.onclose?.();
  socket.onerror = () => adapter.onerror?.();
  return adapter;
}
const subscriptions = new Map<string, { callbacks: Set<() => void>; stop: () => void }>();
/** One authenticated socket per business per running app, shared by visible and retained screens. */
export function useCatalogLive(businessId: string | undefined, changed: () => void) {
  const callback = useRef(changed);
  useEffect(() => {
    callback.current = changed;
  }, [changed]);
  useEffect(() => {
    if (!businessId || (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true')) return;
    let subscription = subscriptions.get(businessId);
    if (!subscription) {
      const callbacks = new Set<() => void>();
      const stop = catalogLive(
        authClient.organizationRequest,
        openSocket,
        businessId,
        () => {
          for (const notify of callbacks) notify();
        },
        (work, delay) => {
          const timer = setTimeout(work, delay);
          return () => clearTimeout(timer);
        },
      );
      subscription = { callbacks, stop };
      subscriptions.set(businessId, subscription);
    }
    const notify = () => callback.current();
    subscription.callbacks.add(notify);
    return () => {
      subscription.callbacks.delete(notify);
      if (!subscription.callbacks.size) {
        subscription.stop();
        subscriptions.delete(businessId);
      }
    };
  }, [businessId]);
}
