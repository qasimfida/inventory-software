import { useEffect, useMemo, useRef, useState } from 'react';
import { mergePageCollections } from '@inventory/api-client';
import type { ResourceState } from '@inventory/api-client';
import { useTheme } from '../theme';
/** Retains only visited pages for this exact account/filter scope. No request or storage side effects. */
export function usePageCollection<T>(
  state: ResourceState<T>,
  scope: unknown[],
  page: unknown,
  paths: string[],
  onReset: () => void,
) {
  const { preferences } = useTheme();
  const previousMode = useRef(preferences.pagination);
  useEffect(() => {
    if (previousMode.current !== preferences.pagination) {
      previousMode.current = preferences.pagination;
      onReset();
    }
  }, [preferences.pagination, onReset]);
  const key = JSON.stringify([preferences.pagination, ...scope]);
  const pageKey = JSON.stringify(page);
  const [cache, setCache] = useState<{
    key: string;
    last: T | null;
    page: string | undefined;
    pages: Map<string | undefined, T>;
  }>({ key, last: null, page: undefined, pages: new Map() });
  let current = cache;
  if (cache.key !== key) current = { key, last: null, page: undefined, pages: new Map() };
  if (state.data && (current.last !== state.data || current.page !== pageKey)) {
    const first = (Array.isArray(page) ? page : [page]).every(
      (p) => p === 0 || p === undefined || p === '',
    );
    const pages = first ? new Map<string | undefined, T>() : new Map(current.pages);
    pages.set(pageKey, state.data);
    current = { key, last: state.data, page: pageKey, pages };
  }
  if (current !== cache) setCache(current);
  const fields = JSON.stringify(paths);
  const data = useMemo(
    () =>
      current.pages.size
        ? mergePageCollections([...current.pages.values()], JSON.parse(fields) as string[])
        : null,
    [current.pages, fields],
  );
  if (preferences.pagination !== 'scroll') return state;
  return { ...state, busy: state.busy || (!state.data && !state.error), data };
}
