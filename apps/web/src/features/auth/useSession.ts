import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthenticationError, isTransientReadFailure } from '@inventory/api-client';
import type { Session } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';

// A missing saved session is a normal signed-out state, not a connection failure.
async function savedSession() {
  try {
    return await authClient.current();
  } catch (error) {
    if (error instanceof AuthenticationError && error.status === 401) return null;
    throw error;
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const verifiedSession = useRef<Session | null>(null);
  useEffect(() => {
    verifiedSession.current = session;
  }, [session]);
  const run = useCallback(async (action: () => Promise<Session | null>, background = false) => {
    const current = ++generation.current;
    if (!background) setBusy(true);
    setMessage('');
    try {
      const result = await action();
      if (current === generation.current) {
        const valid = result && Date.parse(result.expiresAt) > Date.now() ? result : null;
        setSession((previous) =>
          JSON.stringify(previous) === JSON.stringify(valid) ? previous : valid,
        );
      }
    } catch (error) {
      if (current === generation.current) {
        // A temporary transport failure cannot extend the existing session expiry.
        // Keep only an already verified session during background checks.
        if (!background || !isTransientReadFailure(error)) setSession(null);
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
    let checking = false;
    const check = () => {
      if (document.hidden) return;
      // Timers can be suspended while hidden. Enforce expiry before revalidating on return.
      if (verifiedSession.current && Date.parse(verifiedSession.current.expiresAt) <= Date.now())
        lock();
      if (checking) return;
      checking = true;
      void run(savedSession, true).finally(() => {
        checking = false;
      });
    };
    const visibility = () => {
      if (!document.hidden) check();
    };
    check();
    const timer = setInterval(check, 60000);
    const reconnect = check;
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      invalidate();
      clearInterval(timer);
      window.removeEventListener('online', reconnect);
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
