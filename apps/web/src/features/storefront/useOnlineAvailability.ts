import { useEffect, useState } from 'react';
import type { OnlineClient } from '@inventory/api-client';
/** Read-only reachability fallback; no writes are queued or retried. */
export function useOnlineAvailability(client: OnlineClient) {
  const [status, setStatus] = useState({ available: false, denied: false });
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void client
        .settings()
        .then(() => {
          if (active) setStatus({ available: true, denied: false });
        })
        .catch((e) => {
          if (active) setStatus({ available: false, denied: [401, 403, 404].includes(e.status) });
        });
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client]);
  return status;
}
