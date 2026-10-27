import { OverflowTabs } from '@/components/common/OverflowTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RefreshCw, X, Plus } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { SearchControl } from '@/components/common/SearchControl';
import { FilterButton } from '@/components/common/FilterButton';
import { ViewTabs } from '@/components/common/ViewTabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import * as Tabs from '@radix-ui/react-tabs';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPermission, listingIssueCodeSchema } from '@inventory/contracts';
import type { Business, Location, ChannelListing } from '@inventory/contracts';
import { onlineProductTabs, onlineTabLabels, selectionToggle } from '@inventory/api-client';
import type { OnlineProductTab } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { FormSheet } from '@/components/common/FormSheet';
import { ManageProduct } from '../catalog/ManageProduct';
import { useOnlineProducts } from './useOnlineProducts';
import { useStorefrontOnline } from './useStorefrontOnline';
import { OnlineProductsTable } from './OnlineProductsTable';
import { OnlineListingHistory } from './OnlineListingHistory';
import { OnlineBulkResult } from './OnlineBulkResult';
export function OnlineProducts({
  business,
  storeId,
  locations,
}: {
  business: Business;
  storeId: string;
  locations: Location[];
}) {
  const navigate = useNavigate(),
    online = useStorefrontOnline(),
    [params] = useSearchParams();
  const routeTab = params.get('tab');
  const routeAttention = params.get('attention');
  const [tab, setTab] = useState<OnlineProductTab>(
      routeTab === 'ready' || routeTab === 'changes-required' ? routeTab : 'active',
    ),
    [attention, setAttention] = useState<'sold-out' | 'warnings' | ''>(
      routeAttention === 'sold-out' || routeAttention === 'warnings' ? routeAttention : '',
    ),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [issue, setIssue] = useState(''),
    [sort, setSort] = useState<'title' | 'updated'>('title'),
    [cursors, setCursors] = useState<string[]>([]);
  const [selected, setSelected] = useState(new Map<string, ChannelListing>()),
    [history, setHistory] = useState(''),
    [message, setMessage] = useState(''),
    [grid, setGrid] = useState(false),
    [fix, setFix] = useState<{ listing: ChannelListing; field: string } | null>(null);
  const [confirm, setConfirm] = useState<ChannelListing[] | null>(null);
  const q = {
    ...(attention !== 'warnings'
      ? { tab: attention === 'sold-out' ? ('active' as const) : tab }
      : {}),
    ...(attention ? { attention } : {}),
    search,
    sort,
    limit: 25,
    ...(category ? { category } : {}),
    ...(issue ? { issue } : {}),
    ...(cursors.length ? { cursor: cursors[cursors.length - 1]! } : {}),
  };
  const { model, state, client, categories } = useOnlineProducts(business.id, storeId, q);
  const manage = hasPermission(business, 'onlineStore.manage'),
    disabled = state.busy || !online || !!state.error;
  function reset() {
    setCursors([]);
    setSelected(new Map());
    setMessage('');
  }
  function switchTab(t: OnlineProductTab) {
    setTab(t);
    setAttention('');
    reset();
  }
  const [lastRoute, setLastRoute] = useState(`${routeTab}:${routeAttention}`);
  if (lastRoute !== `${routeTab}:${routeAttention}`) {
    setLastRoute(`${routeTab}:${routeAttention}`);
    setAttention(
      routeAttention === 'sold-out' || routeAttention === 'warnings' ? routeAttention : '',
    );
    if (routeTab && onlineProductTabs.includes(routeTab as OnlineProductTab)) {
      setTab(routeTab as OnlineProductTab);
      setCursors([]);
      setSelected(new Map());
    }
  }
  async function command(
    action: 'publish' | 'pause' | 'resume' | 'remove' | 'validate',
    items: ChannelListing[],
    all = false,
  ) {
    if (disabled) return;
    const result = await model.command({
      action,
      items: items.map((i) => ({ id: i.id, version: i.version })),
      all,
    });
    if (result) {
      setSelected(new Map());
      await model.load(q);
    }
  }
  function toggle(l: ChannelListing) {
    try {
      setSelected(selectionToggle(selected, l.id, l));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function openFix(listing: ChannelListing, field: string) {
    if (field === 'allowedImageHosts') {
      void navigate('/online-store/settings/images');
      return;
    }
    if (field === 'stockSources') {
      if (hasPermission(business, 'stock.read'))
        void navigate(
          '/inventory?search=' +
            encodeURIComponent(state.previews[listing.id]?.source.variants[0]?.sku ?? ''),
        );
      else setMessage('Ask an inventory operator to create a stock record in a linked warehouse.');
      return;
    }
    if (
      (field === 'title' && listing.overrides.title !== null) ||
      (field === 'description' && listing.overrides.description !== null) ||
      (field.startsWith('images') && listing.overrides.images !== null) ||
      (field.includes('price') && listing.overrides.price !== null)
    ) {
      void navigate('/online-store/products/' + listing.id);
      return;
    }
    setFix({ listing, field });
  }
  const open = (id: string) => {
    void navigate('/online-store/products/' + id);
  };
  return (
    <section className="collection-surface space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2>Online products</h2>
        {manage && hasPermission(business, 'products.read') && (
          <Button disabled={disabled} onClick={() => void navigate('/online-store/products/add')}>
            <Plus aria-hidden="true" /> Add products
          </Button>
        )}
      </div>
      <Tabs.Root value={tab} onValueChange={(value) => switchTab(value as OnlineProductTab)}>
        <OverflowTabs label="Publication status">
          <Tabs.List className="view-tabs settings-tabs" aria-label="Publication status">
            {onlineProductTabs.map((t) => (
              <Tabs.Trigger key={t} value={t} aria-controls="online-products-panel">
                {onlineTabLabels[t]}{' '}
                <StatusBadge
                  tone={t === 'changes-required' ? 'warning' : t === 'active' ? 'success' : 'info'}
                >
                  {state.page
                    ? t === 'active'
                      ? state.page.counts.active + state.page.counts.paused
                      : t === 'ready'
                        ? state.page.counts.ready
                        : state.page.counts.needs_changes
                    : '…'}
                </StatusBadge>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </OverflowTabs>
      </Tabs.Root>
      <div id="online-products-panel" role="tabpanel" aria-label={onlineTabLabels[tab]} />
      <div className="collection-toolbar">
        <div className="collection-search">
          <SearchControl
            label="Search online products"
            value={search}
            onChange={(value) => {
              setSearch(value);
              reset();
            }}
            suggestions={state.page?.items.map((l) => ({ value: l.id, label: l.title })) ?? []}
            onSelect={open}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <FilterButton
              active={[
                category ? (categories.find((c) => c.id === category)?.name ?? 'Category') : '',
                issue.replaceAll('_', ' '),
                attention,
              ].filter(Boolean)}
            />
          </PopoverTrigger>
          <PopoverContent align="end" className="space-y-3">
            <label htmlFor="online-category">
              Category
              <Select
                id="online-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  reset();
                }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label htmlFor="online-issue">
              Issue
              <Select
                id="online-issue"
                value={issue}
                onChange={(e) => {
                  setIssue(e.target.value);
                  reset();
                }}
              >
                <option value="">All issues</option>
                {listingIssueCodeSchema.options
                  .filter(
                    (i) => i !== 'PRICE_BELOW_COST' || hasPermission(business, 'purchases.read'),
                  )
                  .map((i) => (
                    <option key={i} value={i}>
                      {i.replaceAll('_', ' ')}
                    </option>
                  ))}
              </Select>
            </label>
            <label htmlFor="online-attention">
              Attention
              <Select
                id="online-attention"
                value={attention}
                onChange={(e) => {
                  setAttention(e.target.value as typeof attention);
                  if (e.target.value === 'sold-out') setTab('active');
                  reset();
                }}
              >
                <option value="">All products in tab</option>
                <option value="sold-out">Sold-out active listings</option>
                <option value="warnings">Warnings across all tabs</option>
              </Select>
            </label>
            <label htmlFor="online-sort">
              Sort
              <Select
                id="online-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value === 'updated' ? 'updated' : 'title');
                  reset();
                }}
              >
                <option value="title">Title</option>
                <option value="updated">Recently updated</option>
              </Select>
            </label>
          </PopoverContent>
        </Popover>
        <ViewTabs
          value={grid ? 'grid' : 'list'}
          onChange={(v) => setGrid(v === 'grid')}
          label="Online products"
          panelId="online-collection"
        />
        <IconButton
          label="Refresh products"
          icon={RefreshCw}
          disabled={state.busy}
          onClick={() => void model.load(q)}
        />
      </div>
      {(search || category || issue || attention || tab !== 'active') && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Applied publication filters">
          <span className="text-sm text-muted-foreground">
            {[
              search && `Search: ${search}`,
              category && categories.find((c) => c.id === category)?.name,
              issue.replaceAll('_', ' '),
              attention,
              tab !== 'active' && onlineTabLabels[tab],
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch('');
              setCategory('');
              setIssue('');
              setAttention('');
              setTab('active');
              reset();
              void navigate('/online-store/products', { replace: true });
            }}
          >
            <X aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      )}
      {!online && <p role="status">Offline. Last loaded data is read-only.</p>}
      {state.page && (
        <p className="text-muted-foreground">
          Updated · As of {new Date(state.page.asOf).toLocaleString()}
        </p>
      )}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.load(q)} />}
      {message && <p role="alert">{message}</p>}
      {state.busy && <LoadingState message="Loading online products…" />}
      {manage && tab === 'changes-required' && (
        <Button disabled={disabled} onClick={() => void command('validate', [], true)}>
          Re-check all
        </Button>
      )}
      {manage && tab === 'ready' && (
        <Button
          disabled={disabled}
          onClick={() => {
            void model
              .allReady(q)
              .then((items) => {
                if (items.length) void command('publish', items);
                else setMessage('No ready products match these filters.');
              })
              .catch((e) => setMessage(e.message));
          }}
        >
          Publish all ready (maximum 200)
        </Button>
      )}
      {state.page?.items.length ? (
        <OnlineProductsTable
          items={state.page.items}
          previews={state.previews}
          client={client}
          business={business}
          selected={selected}
          busy={disabled}
          toggle={toggle}
          action={(a, l) => (a === 'remove' ? setConfirm([l]) : void command(a, [l]))}
          open={open}
          history={setHistory}
          fix={openFix}
          grid={grid}
          selectAll={() => {
            const all = state.page!.items.every((l) => selected.has(l.id));
            const next = new Map(selected);
            for (const l of state.page!.items) {
              if (all) next.delete(l.id);
              else if (next.size < 200) next.set(l.id, l);
            }
            setSelected(next);
          }}
        />
      ) : (
        !state.busy &&
        !state.error && (
          <EmptyState
            message="No products in this view"
            description="Change the filters or add products to start reviewing them."
            {...(manage
              ? {
                  action: {
                    label: 'Add products',
                    onClick: () => void navigate('/online-store/products/add'),
                  },
                }
              : {})}
          />
        )
      )}
      {!!selected.size && (
        <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border bg-card p-3">
          <span>{selected.size} selected / 200</span>
          <Button variant="ghost" onClick={() => setSelected(new Map())}>
            Clear
          </Button>
          {tab === 'ready' && (
            <Button
              disabled={disabled}
              onClick={() => void command('publish', [...selected.values()])}
            >
              Publish selected
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={disabled}
            onClick={() => setConfirm([...selected.values()])}
          >
            Remove from selection
          </Button>
        </div>
      )}
      {(!!cursors.length || state.page?.nextCursor) && (
        <nav aria-label="Online product pages" className="flex gap-2">
          <Button
            disabled={!cursors.length || state.busy}
            onClick={() => {
              setCursors(cursors.slice(0, -1));
              setSelected(new Map());
            }}
          >
            Previous
          </Button>
          <span>Page {cursors.length + 1}</span>
          <Button
            disabled={!state.page?.nextCursor || state.busy}
            onClick={() => {
              setCursors([...cursors, state.page!.nextCursor!]);
              setSelected(new Map());
            }}
          >
            Next
          </Button>
        </nav>
      )}
      {history && (
        <OnlineListingHistory client={client} id={history} onClose={() => setHistory('')} />
      )}
      {fix && (
        <ManageProduct
          business={business}
          locations={locations}
          productId={fix.listing.productId}
          focusField={fix.field}
          onClose={() => {
            const l = fix.listing;
            setFix(null);
            void client
              .detail(l.id)
              .then((fresh) =>
                model.command({
                  action: 'validate',
                  all: false,
                  items: [{ id: l.id, version: fresh.listing.version }],
                }),
              )
              .then(() => model.load(q))
              .catch(() => model.load(q));
          }}
        />
      )}
      {confirm && (
        <FormSheet title="Remove from online store?" open onOpenChange={() => setConfirm(null)}>
          <p>Remove {confirm.length} selections? Catalog products and stock are kept.</p>
          <Button
            variant="destructive"
            disabled={disabled}
            onClick={() => {
              void command('remove', confirm);
              setConfirm(null);
            }}
          >
            Confirm removal
          </Button>
        </FormSheet>
      )}
      {state.result && (
        <OnlineBulkResult
          result={state.result}
          onClose={model.clearResult}
          onOpen={(id) => {
            model.clearResult();
            open(id);
          }}
          onTab={(t) => {
            model.clearResult();
            switchTab(t);
          }}
        />
      )}
    </section>
  );
}
