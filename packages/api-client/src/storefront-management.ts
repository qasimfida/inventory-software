import {
  onlineProductPageSchema,
  onlinePickerQuerySchema,
  onlinePickerPageSchema,
  onlineProductDetailSchema,
} from '@inventory/contracts';
import type { OnlinePickerQuery } from '@inventory/contracts';
import { queryString } from './catalog.js';
import type { CancellationSignal } from './cancellation.js';
import { z } from 'zod';
import {
  onlineCommandSchema,
  onlineImageResultSchema,
  onlineResultSchema,
  onlineSettingsResultSchema,
  listingQuerySchema,
  listingPageSchema,
  onlineOverviewSchema,
  slugResultSchema,
  hostImpactSchema,
  listingEventSchema,
} from '@inventory/contracts';
import type { OnlineCommand, ListingQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
/** Caller retains the command UUID across an uncertain response. Mutations are never auto-retried. */
export function createOnlineStoreClient(
  request: OrganizationTransport,
  businessId: string,
  storeId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/stores/${encodeURIComponent(storeId)}/online-store`;
  return {
    productPage: async (q: Partial<ListingQuery> = {}, signal?: CancellationSignal) =>
      onlineProductPageSchema.parse(
        await request(
          `${path}/product-list?${queryString(listingQuerySchema.parse(q))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    detail: async (id: string) =>
      onlineProductDetailSchema.parse(await request(`${path}/listings/${encodeURIComponent(id)}`)),
    products: async (q: Partial<OnlinePickerQuery> = {}, signal?: CancellationSignal) =>
      onlinePickerPageSchema.parse(
        await request(
          `${path}/products?${queryString(onlinePickerQuerySchema.parse(q))}`,
          'GET',
          undefined,
          signal,
        ),
      ),

    imagePreview: async (url: string) =>
      onlineImageResultSchema.parse(await request(`${path}/image-preview`, 'POST', { url })),
    settings: async () => onlineSettingsResultSchema.parse(await request(`${path}/settings`)),
    overview: async () => onlineOverviewSchema.parse(await request(`${path}/overview`)),
    listings: async (query: Partial<ListingQuery> = {}, signal?: CancellationSignal) => {
      const q = listingQuerySchema.parse(query);
      const pairs = Object.entries(q)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      return listingPageSchema.parse(
        await request(`${path}/listings?${pairs}`, 'GET', undefined, signal),
      );
    },
    checkSlug: async (slug: string, signal?: CancellationSignal) =>
      slugResultSchema.parse(
        await request(
          `${path}/check-slug?slug=${encodeURIComponent(slug)}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    hostImpact: async (host: string) =>
      hostImpactSchema.parse(
        await request(`${path}/image-host-impact?host=${encodeURIComponent(host)}`),
      ),
    history: async (id: string) =>
      z
        .array(listingEventSchema)
        .parse(await request(`${path}/listings/${encodeURIComponent(id)}/history`)),
    command: async (input: OnlineCommand) =>
      onlineResultSchema.parse(
        await request(`${path}/commands`, 'POST', onlineCommandSchema.parse(input)),
      ),
  };
}
