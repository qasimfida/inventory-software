import { createContext, useContext, useMemo } from 'react';
export function useScrollEvents() {
  return useMemo(() => {
    let version = 0;
    const listeners = new Set<() => void>();
    return {
      version: () => version,
      notify: () => {
        version++;
        listeners.forEach((fn) => fn());
      },
      subscribe: (fn: () => void) => {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
    };
  }, []);
}
export const ScrollEvents = createContext<ReturnType<typeof useScrollEvents> | null>(null);
export const useScrollSource = () => useContext(ScrollEvents);
