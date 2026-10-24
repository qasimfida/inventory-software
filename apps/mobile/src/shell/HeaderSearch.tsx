import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { availableRoutes, searchWorkspace } from '@inventory/api-client';
import type { WorkspaceSearchResult } from '@inventory/api-client';
import { SearchControl } from '../ui/SearchControl';
import { Text } from '../ui/Themed';
import { authClient } from '../auth/client';
import { useWorkspace } from './WorkspaceContext';
import { useTheme } from '../theme';
export function HeaderSearch({ go }: { go: (path: string) => void }) {
  const { business, state } = useWorkspace(),
    theme = useTheme();
  const [query, setQuery] = useState(''),
    [result, setResult] = useState({ key: '', items: [] as WorkspaceSearchResult[], error: '' });
  const key = `${business?.id}:${query}`;
  useEffect(() => {
    if (!business || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchWorkspace(
        authClient.organizationRequest,
        business,
        state.workspace?.locations ?? [],
        query,
        controller.signal,
      )
        .then((items) => {
          if (!controller.signal.aborted) setResult({ key, items, error: '' });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ key, items: [], error: 'Unable to search. Check your connection.' });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [business, state.workspace, query, key]);
  const items = [
    ...(result.key === key ? result.items : []),
    ...availableRoutes(business).filter((r) => r.title.toLowerCase().includes(query.toLowerCase())),
  ];
  return (
    <View style={{ paddingHorizontal: theme.spacing.medium }}>
      <SearchControl
        label="Search routes and records"
        value={query}
        onChange={setQuery}
        onSelect={(path) => {
          go(path);
          setQuery('');
        }}
        suggestions={items.map((i) => ({ value: i.path, label: i.title }))}
        busy={Boolean(business) && query.trim().length >= 2 && result.key !== key}
      />
      {result.key === key && Boolean(result.error) && (
        <Text accessibilityRole="alert">{result.error}</Text>
      )}
    </View>
  );
}
