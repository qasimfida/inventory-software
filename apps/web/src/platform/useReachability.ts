import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
export function useReachability() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
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
      try {
        await apiClient.getHealth('ready');
        if (active) setOnline(true);
      } catch {
        if (active) setOnline(false);
      } finally {
        busy = false;
      }
    };
    const connected = () => {
      void probe();
    };
    const disconnected = () => setOnline(false);
    connected();
    const timer = setInterval(connected, 5000);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);
  return online;
}
