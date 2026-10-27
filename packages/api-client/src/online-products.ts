import { onlineError, onlineMessages } from './online-messages.js';
import { onlineStoreChanges } from './online-store-setup.js';
import { canonicalJson, formatMinorUnits, toMinorUnits } from '@inventory/domain';
import { evaluateStorefrontReadiness } from '@inventory/contracts';
import type {
  ChannelListing,
  OnlineCommand,
  OnlineOverrides,
  OnlineProductPreview,
  ListingQuery,
} from '@inventory/contracts';
import type { createOnlineStoreClient } from './storefront-management.js';
export type OnlineClient = ReturnType<typeof createOnlineStoreClient>;
export const onlineProductTabs = ['active', 'changes-required', 'ready'] as const;
export type OnlineProductTab = (typeof onlineProductTabs)[number];
export const onlineTabLabels = {
  active: 'Active',
  'changes-required': 'Changes required',
  ready: 'Ready to publish',
};
export function onlinePrice(p: OnlineProductPreview) {
  const prices = p.source.variants.filter((v) => v.priceMinor !== null && v.currency);
  return prices.length
    ? [...new Set(prices.map((v) => formatMinorUnits(v.priceMinor!, v.currency!)))].join(' / ')
    : 'Price missing';
}
export function onlineStatus(l: ChannelListing, p?: OnlineProductPreview) {
  if (l.status === 'paused') return onlineMessages.paused;
  if (l.status === 'active')
    return l.availability === 'SOLD_OUT'
      ? p?.soldOutBehavior === 'hide'
        ? onlineMessages.hiddenSoldOut
        : onlineMessages.soldOut
      : l.overrides.visible
        ? 'Live'
        : 'Hidden';
  return l.status === 'ready' ? 'Ready to publish' : 'Changes required';
}
export function overridePreview(p: OnlineProductPreview, o: OnlineOverrides) {
  const source = {
    ...p.inherited,
    title: o.title ?? p.inherited.title,
    description: o.description ?? p.inherited.description,
    images: o.images ?? p.inherited.images,
    variants: p.inherited.variants.map((v) => ({
      ...v,
      ...(o.price
        ? {
            priceMinor: toMinorUnits(o.price.unitPrice, o.price.currency),
            currency: o.price.currency,
            posPriceMinor: v.priceMinor,
          }
        : {}),
    })),
  };
  return { ...p, source, title: source.title, issues: evaluateStorefrontReadiness(source).issues };
}
export function selectionToggle<T>(current: Map<string, T>, id: string, value: T) {
  const next = new Map(current);
  if (next.has(id)) next.delete(id);
  else {
    if (next.size >= 200) throw new Error(onlineMessages.limit);
    next.set(id, value);
  }
  return next;
}
type Command = OnlineCommand extends infer C
  ? C extends { idempotencyKey: string }
    ? Omit<C, 'idempotencyKey'>
    : never
  : never;
type State = {
  page: Awaited<ReturnType<OnlineClient['listings']>> | null;
  previews: Record<string, OnlineProductPreview>;
  busy: boolean;
  error: string;
  result: Awaited<ReturnType<OnlineClient['command']>> | null;
};
/** Bounded page loader and single-attempt, stable-identity commands; never persists tenant data. */
export class OnlineProductsModel {
  private state: State = { page: null, previews: {}, busy: false, error: '', result: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  private mutating = false;
  private keys = new Map<string, string>();
  constructor(
    readonly client: OnlineClient,
    private key: () => string,
  ) {}
  snapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(p: Partial<State>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((fn) => fn());
  }
  reset = () => {
    this.generation++;
    this.mutating = false;
    this.keys.clear();
    this.publish({ page: null, previews: {}, busy: false, error: '', result: null });
  };
  clearResult = () => this.publish({ result: null });
  async load(q: Partial<ListingQuery>, signal?: Parameters<OnlineClient['listings']>[1]) {
    if (this.mutating) return;
    const gen = ++this.generation;
    this.publish({ busy: true, error: '' });
    try {
      const { page, previews } = await this.client.productPage(q, signal);
      if (gen === this.generation) this.publish({ page, previews, busy: false });
    } catch (error) {
      if (gen === this.generation) this.fail(error);
    }
  }
  private fail(error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
    this.publish({
      busy: false,
      error: onlineError(error),
      ...([401, 403, 404].includes(status) ? { page: null, previews: {} } : {}),
    });
  }
  async command(input: Command) {
    if (this.mutating) return null;
    this.mutating = true;
    const gen = ++this.generation;
    this.publish({ busy: true, error: '', result: null });
    const identity = canonicalJson(input),
      idempotencyKey = this.keys.get(identity) ?? this.key();
    this.keys.set(identity, idempotencyKey);
    try {
      const result = await this.client.command({ ...input, idempotencyKey });
      if (gen !== this.generation) return null;
      this.keys.delete(identity);
      onlineStoreChanges.notify();
      this.publish({ busy: false, result });
      return result;
    } catch (error) {
      if (gen === this.generation) this.fail(error);
      return null;
    } finally {
      if (gen === this.generation) this.mutating = false;
    }
  }
  async allReady(q: Partial<ListingQuery>) {
    const items: ChannelListing[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.client.listings({
        search: q.search ?? '',
        sort: q.sort ?? 'title',
        ...(q.category ? { category: q.category } : {}),
        ...(q.issue ? { issue: q.issue } : {}),
        tab: 'ready',
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      items.push(...page.items);
      if (items.length > 200 || (items.length === 200 && page.nextCursor))
        throw new Error(
          'More than 200 ready items match. Narrow the filters or publish in batches.',
        );
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return items;
  }
}
