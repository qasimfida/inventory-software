import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { createApiClient } from '@inventory/api-client';
import { apiOrigin } from '../auth/api-origin';
export function useReachability() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
      let active = true;
      void import('@inventory/api-client/mock').then(({ demoController }) => {
        if (active) setOnline(!['error', 'offline'].includes(demoController.scenario));
      });
      return () => {
        active = false;
      };
    }
    let active = true,
      busy = false;
    const probe = async () => {
      if (busy) return;
      busy = true;
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 5000);
      try {
        await createApiClient(apiOrigin, (url) =>
          fetch(url, { signal: controller.signal }),
        ).getHealth('ready');
        if (active) setOnline(true);
      } catch {
        if (active) setOnline(false);
      } finally {
        clearTimeout(timer);
        busy = false;
      }
    };
    void probe();
    const timer = setInterval(() => {
      void probe();
    }, 5000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void probe();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  return online;
}
