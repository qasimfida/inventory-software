import type { Business } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { createOnlineStoreClient } from './storefront-management.js';
import { OnlineProductsModel } from './online-products.js';
import type { OrganizationTransport } from './organization.js';
/** Bounded collection status read. No catalog details or cost fields are fetched. */
export function productChannels(
  request: OrganizationTransport,
  business: Business,
  storeId: string,
  key: () => string,
) {
  const client = createOnlineStoreClient(request, business.id, storeId);
  const commands = new OnlineProductsModel(client, key);
  return {
    commands,
    canManage: hasPermission(business, 'onlineStore.manage') && !!storeId,
    async load(ids: string[]) {
      const unique = [...new Set(ids)].slice(0, 200);
      if (!unique.length) return [];
      const items = [];
      for (let offset = 0; offset < unique.length; offset += 50) {
        const q = { productIds: unique.slice(offset, offset + 50).join(','), limit: 100 };
        let page = await client.listings(q);
        items.push(...page.items);
        while (page.nextCursor) {
          page = await client.listings({ ...q, cursor: page.nextCursor });
          items.push(...page.items);
          if (items.length > 2000)
            throw new Error('Too many channel variants. Narrow the selection.');
        }
      }
      return items;
    },
    add(ids: string[]) {
      return commands.command({
        action: 'select',
        items: [...new Set(ids)].map((productId) => ({ productId, variantId: null })),
      });
    },
  };
}
