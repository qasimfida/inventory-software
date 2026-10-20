import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AuthenticationError } from '@inventory/api-client';
import type { Session } from '@inventory/contracts';
import { authClient } from './client';
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
      const value = await action();
      if (current === generation.current) setSession(value);
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
      lock();
      void run(() => authClient.current());
    };
    check();
    const subscription = AppState.addEventListener('change', (state) =>
      state === 'active' ? check() : lock(),
    );
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void run(() => authClient.current(), true);
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
