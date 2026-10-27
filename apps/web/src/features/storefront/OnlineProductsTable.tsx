import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Business, ChannelListing, OnlineProductPreview } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { onlinePrice, onlineStatus } from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { Eye, History, Send, Pause, Play, Trash2, RefreshCw } from 'lucide-react';
import { Table, TableScroll } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/common/IconButton';
import { OnlineIssueMenu } from './OnlineIssueMenu';
import { OnlineProductImage } from './OnlineProductImage';
export function OnlineProductsTable({
  items,
  previews,
  client,
  business,
  selected,
  busy,
  toggle,
  selectAll,
  action,
  open,
  history,
  fix,
  grid = false,
}: {
  items: ChannelListing[];
  previews: Record<string, OnlineProductPreview>;
  client: OnlineClient;
  business: Business;
  selected: Map<string, ChannelListing>;
  busy: boolean;
  toggle: (l: ChannelListing) => void;
  selectAll: () => void;
  grid?: boolean;
  action: (
    action: 'publish' | 'pause' | 'resume' | 'remove' | 'validate',
    l: ChannelListing,
  ) => void;
  open: (id: string) => void;
  history: (id: string) => void;
  fix: (l: ChannelListing, field: string) => void;
}) {
  const manage = hasPermission(business, 'onlineStore.manage'),
    all = items.length > 0 && items.every((l) => selected.has(l.id));
  const selection = (l: ChannelListing) => (
    <Checkbox
      aria-label={`Select ${l.title}`}
      disabled={busy}
      checked={selected.has(l.id)}
      onCheckedChange={() => toggle(l)}
    />
  );
  const selectHeader = (
    <Checkbox
      aria-label="Select all products on this page"
      disabled={busy || !items.length}
      checked={all ? true : items.some((l) => selected.has(l.id)) ? 'indeterminate' : false}
      onCheckedChange={selectAll}
    />
  );
  const status = (l: ChannelListing) => (
    <div className="flex items-center gap-1">
      <StatusBadge
        tone={l.status === 'needs_changes' ? 'warning' : l.status === 'active' ? 'success' : 'info'}
      >
        {onlineStatus(l, previews[l.id])}
      </StatusBadge>
      <OnlineIssueMenu
        issues={l.issues}
        disabled={busy}
        canFix={manage && hasPermission(business, 'products.write')}
        fix={(field) => fix(l, field)}
      />
    </div>
  );
  const actions = (l: ChannelListing) => (
    <div className="flex items-center justify-end gap-1">
      <IconButton label="Edit online details" icon={Eye} onClick={() => open(l.id)} />
      <IconButton label="View history" icon={History} onClick={() => history(l.id)} />
      {manage && (
        <>
          {l.status === 'ready' && (
            <IconButton
              label="Publish"
              icon={Send}
              disabled={busy}
              onClick={() => action('publish', l)}
            />
          )}
          {l.status === 'active' && (
            <IconButton
              label="Pause"
              icon={Pause}
              disabled={busy}
              onClick={() => action('pause', l)}
            />
          )}
          {l.status === 'paused' && (
            <IconButton
              label="Resume"
              icon={Play}
              disabled={busy}
              onClick={() => action('resume', l)}
            />
          )}
          {l.status === 'needs_changes' && (
            <IconButton
              label="Re-check"
              icon={RefreshCw}
              disabled={busy}
              onClick={() => action('validate', l)}
            />
          )}
          <IconButton
            label="Remove from store"
            icon={Trash2}
            className="text-destructive"
            disabled={busy}
            onClick={() => action('remove', l)}
          />
        </>
      )}
    </div>
  );
  const image = (l: ChannelListing) => (
    <OnlineProductImage
      client={client}
      title={l.title}
      {...(previews[l.id]?.source.images[0] ? { url: previews[l.id]!.source.images[0] } : {})}
    />
  );
  if (grid)
    return (
      <div id="online-collection">
        {manage && (
          <label className="flex items-center gap-2">{selectHeader}Select all on this page</label>
        )}
        <div className="catalog-product-grid">
          {items.map((l) => (
            <article key={l.id} className="collection-surface space-y-2">
              <div className="flex items-center justify-between gap-2">
                {image(l)}
                {manage && selection(l)}
              </div>
              <Button
                variant="link"
                className="whitespace-normal text-left"
                onClick={() => open(l.id)}
              >
                {l.title}
              </Button>
              <p>
                {previews[l.id] ? onlinePrice(previews[l.id]!) : 'Price unavailable'} ·{' '}
                {previews[l.id]?.quantity ?? '—'} available
              </p>
              {status(l)}
              {actions(l)}
            </article>
          ))}
        </div>
      </div>
    );
  return (
    <TableScroll label="Online products">
      <Table id="online-collection">
        <caption className="sr-only">Online products and publication readiness</caption>
        <thead>
          <tr>
            {manage && <th scope="col">{selectHeader}</th>}
            <th scope="col">Product</th>
            <th scope="col">Price</th>
            <th scope="col">Available</th>
            <th scope="col">Status</th>
            <th scope="col" data-actions>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id}>
              {manage && <td>{selection(l)}</td>}
              <th scope="row">
                <div className="flex items-center gap-2">
                  {image(l)}
                  <Button
                    variant="link"
                    className="text-left whitespace-normal"
                    onClick={() => open(l.id)}
                  >
                    {l.title}
                  </Button>
                </div>
              </th>
              <td className="tabular-nums whitespace-nowrap">
                {previews[l.id] ? onlinePrice(previews[l.id]!) : 'Unavailable'}
              </td>
              <td className="tabular-nums">{previews[l.id]?.quantity ?? '—'}</td>
              <td>{status(l)}</td>
              <td data-actions>{actions(l)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
}
