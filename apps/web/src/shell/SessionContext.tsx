import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '@/features/auth/useSession';
import { settingsModel } from '@/platform/settings';
const Context = createContext<ReturnType<typeof useSession> | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSession();
  useEffect(() => {
    void settingsModel.connect(value.session?.user.id ?? null);
    return () => {
      void settingsModel.connect(null);
    };
  }, [value.session?.user.id]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccount() {
  const context = useContext(Context);
  if (!context) throw new Error('SessionProvider is required');
  return context;
}
