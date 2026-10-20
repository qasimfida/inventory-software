import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthenticationError } from '@inventory/api-client';
import type { Session } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const run = useCallback(async (action: () => Promise<Session | null>, background = false) => {
    const current = ++generation.current;
    if (!background) setBusy(true);
    setMessage('');
    try {
      const result = await action();
      if (current === generation.current) setSession(result);
    } catch (error) {
      if (current === generation.current) {
        setSession(null);
        setMessage(
          error instanceof AuthenticationError
            ? error.message
            : 'Unable to verify the session. Reconnect and try again.',
        );
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, []);
  const lock = useCallback(() => {
    generation.current++;
    setSession(null);
    setBusy(false);
  }, []);
  useEffect(() => {
    const invalidate = () => {
      generation.current++;
    };
    const check = () => {
      if (!document.hidden) {
        lock();
        void run(() => authClient.current());
      }
    };
    const visibility = () => (document.hidden ? lock() : check());
    check();
    const timer = setInterval(() => {
      if (!document.hidden) void run(() => authClient.current(), true);
    }, 60000);
    window.addEventListener('offline', lock);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      invalidate();
      clearInterval(timer);
      window.removeEventListener('offline', lock);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [run, lock]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(lock, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [session, lock]);
  return { session, busy, message, run };
}
