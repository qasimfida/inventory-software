import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '../auth/useSession';
import { settingsModel } from '../settings/model';
const Context = createContext<ReturnType<typeof useSession> | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const account = useSession();
  useEffect(() => {
    void settingsModel.connect(account.session?.user.id ?? null);
    return () => {
      void settingsModel.connect(null);
    };
  }, [account.session?.user.id]);
  return <Context.Provider value={account}>{children}</Context.Provider>;
}
export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error('Session provider required');
  return value;
}
