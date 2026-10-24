import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { availableRoutes, searchWorkspace } from '@inventory/api-client';
import type { WorkspaceSearchResult } from '@inventory/api-client';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { authClient } from '@/platform/auth-client';
import { useWorkspace } from './WorkspaceContext';
export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business, state } = useWorkspace(),
    navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState({
    key: '',
    records: [] as WorkspaceSearchResult[],
    message: '',
  });
  const key = `${business?.id ?? ''}:${query}`,
    records = response.key === key ? response.records : [];
  const message =
    response.key === key ? response.message : query.trim().length >= 2 ? 'Searching records…' : '';
  const routes = availableRoutes(business).filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (!open || !business || query.trim().length < 2) return;
    const timer = setTimeout(() => {
      void searchWorkspace(
        authClient.organizationRequest,
        business,
        state.workspace?.locations ?? [],
        query,
        controller.signal,
      )
        .then((results) => {
          if (!cancelled)
            setResponse({
              key,
              records: results,
              message: results.length ? '' : 'No matching records.',
            });
        })
        .catch(() => {
          if (!cancelled)
            setResponse({
              key,
              records: [],
              message: 'Records could not be searched. Check your connection and try again.',
            });
        });
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, query, business, state.workspace, key]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-search-result]'),
          ];
          if (!items.length) return;
          event.preventDefault();
          const index = items.findIndex((item) => item === document.activeElement);
          items[
            (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
          ]?.focus();
        }}
      >
        <DialogTitle>Search workspace</DialogTitle>
        <DialogDescription>
          Find pages, products and customers in your authorized business scope.
        </DialogDescription>
        <Input
          aria-label="Search workspace"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <div className="space-y-1" aria-label="Search results">
          {[...routes, ...records].map((result) => (
            <Button
              data-search-result
              key={result.path + result.title}
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => {
                void navigate(result.path);
                onOpenChange(false);
              }}
            >
              {result.title}
            </Button>
          ))}
        </div>
        {message && <p role="status">{message}</p>}
        {!routes.length && !records.length && !message && <p>No matching pages.</p>}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close search
        </Button>
      </DialogContent>
    </Dialog>
  );
}
