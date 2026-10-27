import { StatusBadge } from '../ui/StatusBadge';
import { ViewTabs } from '../ui/ViewTabs';
import { FilterButton } from '../ui/FilterButton';
import { IconAction } from '../ui/IconAction';
import { SearchControl } from '../ui/SearchControl';
import { ScrollableTabs } from '../ui/ScrollableTabs';
import { useOnlineSelectionDock } from './OnlineSelectionDock';
import { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { hasPermission, listingIssueCodeSchema } from '@inventory/contracts';
import type { Business, Location, ChannelListing } from '@inventory/contracts';
import { onlineProductTabs, onlineTabLabels, selectionToggle } from '@inventory/api-client';
import type { OnlineProductTab } from '@inventory/api-client';
import { Action, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { SidePanel } from '../ui/SidePanel';
import { ConfirmAction } from '../ui/ConfirmAction';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { useTheme } from '../theme';
import { useNavigation } from '../shell/Navigation';
import { ManageProduct } from '../catalog/ManageProduct';
import { useOnlineProducts } from './useOnlineProducts';
import { OnlineListingHistory } from './OnlineListingHistory';
import { OnlineProductRows } from './OnlineProductRows';
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
  const { navigate, onlineTab: routeTab, onlineAttention: routeAttention } = useNavigation(),
    theme = useTheme();
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
    [filtersOpen, setFiltersOpen] = useState(false),
    [fix, setFix] = useState<{ listing: ChannelListing; field: string } | null>(null);
  const { setSelection } = useOnlineSelectionDock();
  const [bulkOpen, setBulkOpen] = useState(false);
  const selectedCount = selected.size;
  useEffect(() => {
    setSelection(selectedCount ? { count: selectedCount, open: () => setBulkOpen(true) } : null);
    return () => setSelection(null);
  }, [selectedCount, setSelection]);
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
    disabled = state.busy || !!state.error;
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
  const open = (id: string) => navigate('/online-store/products/' + id);
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">Online products</Text>
      {manage && hasPermission(business, 'products.read') && (
        <Action
          disabled={disabled}
          label="Add products"
          onPress={() => navigate('/online-store/products/add')}
        />
      )}
      <ScrollableTabs label="Publication status">
        {onlineProductTabs.map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => switchTab(t)}
            style={{
              padding: theme.spacing.small,
              borderRadius: theme.controlRadius,
              backgroundColor: tab === t ? theme.colors.card : 'transparent',
            }}
          >
            <Text>{onlineTabLabels[t]}</Text>
            <StatusBadge
              tone={t === 'active' ? 'success' : t === 'changes-required' ? 'warning' : 'info'}
              label={String(
                state.page
                  ? t === 'active'
                    ? state.page.counts.active + state.page.counts.paused
                    : t === 'ready'
                      ? state.page.counts.ready
                      : state.page.counts.needs_changes
                  : '…',
              )}
            />
          </Pressable>
        ))}
      </ScrollableTabs>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        <View style={{ flexGrow: 1 }}>
          <SearchControl
            label="Search online products"
            value={search}
            onChange={(v) => {
              setSearch(v);
              reset();
            }}
            suggestions={state.page?.items.map((l) => ({ value: l.id, label: l.title })) ?? []}
            onSelect={open}
          />
        </View>
        <FilterButton
          active={[
            category ? (categories.find((c) => c.id === category)?.name ?? 'Category') : '',
            issue.replaceAll('_', ' '),
            attention,
          ].filter(Boolean)}
          onPress={() => setFiltersOpen(true)}
        />
        <ViewTabs grid={grid} onChange={setGrid} label="Online products" />
        <IconAction
          label="Refresh products"
          icon="↻"
          disabled={state.busy}
          onPress={() => void model.load(q)}
        />
      </View>
      {filtersOpen && (
        <SidePanel title="Product filters" open onClose={() => setFiltersOpen(false)}>
          <Choice
            label="Category"
            value={category}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(v) => {
              setCategory(v);
              reset();
            }}
          />
          <Choice
            label="Issue"
            value={issue}
            options={[
              { value: '', label: 'All issues' },
              ...listingIssueCodeSchema.options
                .filter(
                  (i) => i !== 'PRICE_BELOW_COST' || hasPermission(business, 'purchases.read'),
                )
                .map((i) => ({ value: i, label: i.replaceAll('_', ' ') })),
            ]}
            onChange={(v) => {
              setIssue(v);
              reset();
            }}
          />
          <Choice
            label="Attention"
            value={attention}
            options={[
              { value: '', label: 'All products in tab' },
              { value: 'sold-out', label: 'Sold-out active listings' },
              { value: 'warnings', label: 'Warnings across all tabs' },
            ]}
            onChange={(v) => {
              setAttention(v as typeof attention);
              if (v === 'sold-out') setTab('active');
              reset();
            }}
          />
          <Choice
            label="Sort"
            value={sort}
            options={[
              { value: 'title', label: 'Title' },
              { value: 'updated', label: 'Recently updated' },
            ]}
            onChange={(v) => {
              setSort(v === 'updated' ? 'updated' : 'title');
              reset();
            }}
          />
        </SidePanel>
      )}
      {state.page && (
        <Text tone="muted">
          As of {new Date(state.page.asOf).toLocaleString()}. Connection errors make this view
          read-only.
        </Text>
      )}
      {(search || category || issue || attention || tab !== 'active') && (
        <Action
          variant="outline"
          icon="×"
          label="Clear filters"
          onPress={() => {
            setSearch('');
            setCategory('');
            setIssue('');
            setAttention('');
            setTab('active');
            setCursors([]);
            setSelected(new Map());
            navigate('/online-store/products');
          }}
        />
      )}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.load(q)} />}
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
      {state.busy && <LoadingState message="Loading online products…" />}
      {manage && tab === 'changes-required' && (
        <Action
          label="Re-check all"
          disabled={disabled}
          onPress={() => void command('validate', [], true)}
        />
      )}
      {manage && tab === 'ready' && (
        <Action
          label="Publish all ready (maximum 200)"
          disabled={disabled}
          onPress={() => {
            void model
              .allReady(q)
              .then((items) => {
                if (items.length) void command('publish', items);
                else setMessage('No ready products match.');
              })
              .catch((e) => setMessage(e.message));
          }}
        />
      )}
      {!state.busy && !state.error && !state.page?.items.length && (
        <EmptyState
          message="No products in this view"
          description="Change filters or add products to start reviewing."
        />
      )}
      <OnlineProductRows
        items={state.page?.items ?? []}
        previews={state.previews}
        business={business}
        client={client}
        selected={selected}
        disabled={disabled}
        toggle={toggle}
        open={open}
        grid={grid}
        selectAll={() => {
          const items = state.page?.items ?? [];
          const all = items.every((l) => selected.has(l.id));
          const next = new Map(selected);
          for (const l of items) {
            if (all) next.delete(l.id);
            else if (next.size < 200) next.set(l.id, l);
          }
          setSelected(next);
        }}
        setFix={(value) => openFix(value.listing, value.field)}
        setHistory={setHistory}
        command={command}
      />
      {!!selected.size && bulkOpen && (
        <SidePanel title="Selected products" open onClose={() => setBulkOpen(false)}>
          <View
            style={{
              backgroundColor: theme.colors.card,
              padding: theme.spacing.medium,
              gap: theme.spacing.small,
            }}
          >
            <Text>{selected.size} selected / 200</Text>
            <Action label="Clear" onPress={() => setSelected(new Map())} />
            {tab === 'ready' && (
              <Action
                label="Publish selected"
                disabled={disabled}
                onPress={() => void command('publish', [...selected.values()])}
              />
            )}
            <ConfirmAction
              label="Remove from selection"
              confirmLabel="Confirm removal"
              description={`Remove ${selected.size} selections? Catalog records are kept.`}
              disabled={disabled}
              onConfirm={() => void command('remove', [...selected.values()])}
            />
          </View>
        </SidePanel>
      )}
      {(!!cursors.length || state.page?.nextCursor) && (
        <>
          <Action
            label="Previous"
            disabled={!cursors.length || state.busy}
            onPress={() => {
              setCursors(cursors.slice(0, -1));
              setSelected(new Map());
            }}
          />
          <Text>Page {cursors.length + 1}</Text>
          <Action
            label="Next"
            disabled={!state.page?.nextCursor || state.busy}
            onPress={() => {
              setCursors([...cursors, state.page!.nextCursor!]);
              setSelected(new Map());
            }}
          />
        </>
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
    </View>
  );
}
