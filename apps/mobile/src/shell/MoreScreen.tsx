import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { availableRoutes, searchWorkspace } from '@inventory/api-client';
import type { WorkspaceSearchResult } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action, Field } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { useWorkspace } from './WorkspaceContext';
export function MoreScreen({ go }: { go: (path: string) => void }) {
  const { business, state } = useWorkspace(),
    theme = useTheme();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [search, setSearch] = useState(''),
    [response, setResponse] = useState({
      key: '',
      records: [] as WorkspaceSearchResult[],
      message: '',
    });
  const key = `${business?.id ?? ''}:${search}`,
    records = response.key === key ? response.records : [],
    message =
      response.key === key
        ? response.message
        : search.trim().length >= 2
          ? 'Searching records…'
          : '';
  const routes = availableRoutes(business),
    groups = [...new Set(routes.map((r) => r.group))];
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (!business || search.trim().length < 2) return;
    const timer = setTimeout(() => {
      void searchWorkspace(
        authClient.organizationRequest,
        business,
        state.workspace?.locations ?? [],
        search,
        controller.signal,
      )
        .then((items) => {
          if (!cancelled)
            setResponse({
              key,
              records: items,
              message: items.length ? '' : 'No matching records.',
            });
        })
        .catch(() => {
          if (!cancelled)
            setResponse({
              key,
              records: [],
              message: 'Records could not be searched. Check your connection and retry.',
            });
        });
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [business, state.workspace, search, key]);
  return (
    <>
      <WorkspaceSwitcher />
      <Field label="Search pages and records" value={search} onChange={setSearch} />
      {groups.map((group) => {
        const items = routes.filter(
          (r) => r.group === group && r.title.toLowerCase().includes(search.toLowerCase()),
        );
        return items.length ? (
          <View key={group} style={{ gap: theme.spacing.small }}>
            {group !== 'Online store' && (
              <DisclosureTrigger
                label={group}
                expanded={!collapsed.includes(group) || !!search}
                onPress={() =>
                  setCollapsed((old) =>
                    old.includes(group) ? old.filter((g) => g !== group) : [...old, group],
                  )
                }
              />
            )}
            {(!collapsed.includes(group) || !!search) &&
              items.map((r) => (
                <Action key={r.path} variant="outline" label={r.title} onPress={() => go(r.path)} />
              ))}
          </View>
        ) : null;
      })}
      {records.map((result) => (
        <Action
          key={result.path}
          variant="outline"
          label={result.title}
          onPress={() => go(result.path)}
        />
      ))}
      {Boolean(message) && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {!routes.some((r) => r.title.toLowerCase().includes(search.toLowerCase())) &&
        !records.length &&
        !message && <Text>No matching pages.</Text>}
    </>
  );
}
