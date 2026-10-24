import { useSyncExternalStore } from 'react';
const media = () => window.matchMedia?.('(prefers-reduced-motion: reduce)');
const snapshot = () => media()?.matches ?? false;
const subscribe = (listener: () => void) => {
  const query = media();
  query?.addEventListener('change', listener);
  return () => query?.removeEventListener('change', listener);
};
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
