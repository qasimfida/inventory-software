import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { availableRoutes, searchWorkspace } from '@inventory/api-client';
import type { WorkspaceSearchResult } from '@inventory/api-client';
import { SearchControl } from '@/components/common/SearchControl';
import { authClient } from '@/platform/auth-client';
import { useWorkspace } from './WorkspaceContext';
export function HeaderSearch() {
  const { business, state } = useWorkspace(),
    navigate = useNavigate();
  const [query, setQuery] = useState(''),
    [response, setResponse] = useState({
      key: '',
      items: [] as WorkspaceSearchResult[],
      error: '',
    });
  const key = `${business?.id}:${query}`;
  useEffect(() => {
    const controller = new AbortController();
    if (!business || query.trim().length < 2) return;
    const timer = setTimeout(() => {
      void searchWorkspace(
        authClient.organizationRequest,
        business,
        state.workspace?.locations ?? [],
        query,
        controller.signal,
      )
        .then((items) => {
          if (!controller.signal.aborted) setResponse({ key, items, error: '' });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResponse({
              key,
              items: [],
              error: 'Unable to search records. Check your connection.',
            });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [business, state.workspace, query, key]);
  const routes = availableRoutes(business).filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()),
  );
  const items = [...(response.key === key ? response.items : []), ...routes];
  return (
    <div>
      <SearchControl
        label="Search routes and records"
        value={query}
        onChange={setQuery}
        suggestions={items.map((item) => ({ value: item.path, label: item.title }))}
        busy={Boolean(business) && query.trim().length >= 2 && response.key !== key}
        onSelect={(path) => {
          void navigate(path);
          setQuery('');
        }}
        emptyMessage="No matching records or pages. Try a name or SKU."
      />
      {response.key === key && response.error && <p role="status">{response.error}</p>}
    </div>
  );
}
