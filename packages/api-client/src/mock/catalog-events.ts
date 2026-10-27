/** Demo-only revision hints. Never used as an authorization or production socket replacement. */
const listeners = new Map<string, Set<() => void>>();
export const demoCatalogChanges = {
  subscribe(businessId: string, fn: () => void) {
    const set = listeners.get(businessId) ?? new Set<() => void>();
    set.add(fn);
    listeners.set(businessId, set);
    return () => {
      set.delete(fn);
      if (!set.size) listeners.delete(businessId);
    };
  },
  notify(businessId: string) {
    listeners.get(businessId)?.forEach((fn) => fn());
  },
};
