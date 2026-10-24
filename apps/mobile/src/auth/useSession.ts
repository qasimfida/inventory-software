import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AuthenticationError, isTransientReadFailure } from '@inventory/api-client';
import type { Session } from '@inventory/contracts';
import { authClient } from './client';
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
  const run = useCallback(async (action: () => Promise<Session | null>, background = false) => {
    const current = ++generation.current;
    if (!background) setBusy(true);
    setMessage('');
    try {
      const value = await action();
      if (current === generation.current) setSession(value);
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
    const check = () => {
      lock();
      void run(savedSession);
    };
    check();
    const subscription = AppState.addEventListener('change', (state) =>
      state === 'active' ? check() : lock(),
    );
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void run(savedSession, true);
    }, 60000);
    return () => {
      invalidate();
      subscription.remove();
      clearInterval(timer);
    };
  }, [run, lock]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(lock, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [session, lock]);
  return { session, busy, message, run };
}
