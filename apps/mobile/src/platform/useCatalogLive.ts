import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { CatalogSocket } from '@inventory/api-client';
import { catalogLive, demoCatalogChanges } from '@inventory/api-client';
import { authClient } from '../auth/client';
// This workspace also includes DOM declarations, which omit RN's native headers overload.
const NativeSocket = WebSocket as typeof WebSocket & {
  new (url: string, protocols: undefined, options: { headers: Record<string, string> }): WebSocket;
};
function openSocket(): CatalogSocket {
  const socket =
    Platform.OS === 'web'
      ? new WebSocket(authClient.catalogSocketUrl)
      : new NativeSocket(authClient.catalogSocketUrl, undefined, {
          headers: { 'x-inventory-client': 'native' },
        });
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
    if (!businessId) return;
    if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true')
      return demoCatalogChanges.subscribe(businessId, () => callback.current());
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
