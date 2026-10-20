const listeners = new Set<() => void>();
export const onOfflineLock = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const lockOffline = () => listeners.forEach((listener) => listener());
