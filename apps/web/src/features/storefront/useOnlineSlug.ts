import { useEffect, useState } from 'react';
import type { OnlineStoreModel } from '@inventory/api-client';
export function useOnlineSlug(model: OnlineStoreModel, slug: string, revision: string) {
  const [result, setResult] = useState({
    slug: '',
    available: false,
    message: '',
    suggestions: [] as string[],
  });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void model
        .checkSlug(slug, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setResult({ slug, ...value });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({
              slug,
              available: false,
              message: 'Unable to check availability. Reconnect and retry.',
              suggestions: [],
            });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [model, slug, revision]);
  return result.slug === slug
    ? result
    : { slug, available: false, message: 'Checking URL availability…', suggestions: [] };
}
