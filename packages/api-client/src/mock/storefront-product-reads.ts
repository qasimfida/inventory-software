import { applyReadinessFixture } from './storefront-readiness-fixture.js';
import { toMinorUnits } from '@inventory/domain';
import { evaluateStorefrontReadiness } from '@inventory/contracts';
import type {
  ChannelListing,
  OnlineStoreSettings,
  OnlineProductPreview,
} from '@inventory/contracts';
import type { DemoSeed } from './seed.js';
export function mockOnlinePreview(
  seed: DemoSeed,
  settings: OnlineStoreSettings,
  productId: string,
  listing?: ChannelListing,
): OnlineProductPreview {
  const p = seed.products.find((p) => p.id === productId);
  const inherited = {
    exists: !!p,
    state: p?.state ?? '',
    title: p?.name ?? '',
    description: p?.description ?? '',
    images: p?.images ?? [],
    allowedHosts: settings.allowedImageHosts,
    category: !!p?.categoryId,
    currency: settings.currency,
    variants: [
      {
        id: p?.id ?? seed.id(777),
        sku: p?.sku ?? '',
        unit: 'EACH',
        complete: true,
        priceMinor: toMinorUnits(
          seed.prices.find((price) => price.variantId === p?.id)?.unitPrice ?? '25',
          settings.currency,
        ),
        posPriceMinor: null,
        currency: settings.currency,
      },
    ],
    hasStockSource: settings.stockSources.length > 0,
    soldOut: listing?.availability === 'SOLD_OUT',
    lowStock: false,
  };
  if (p?.version === 1 && listing) applyReadinessFixture(inherited, listing.issues);
  const o = listing?.overrides;
  const source = {
    ...inherited,
    title: o?.title ?? inherited.title,
    description: o?.description ?? inherited.description,
    images: o?.images ?? inherited.images,
    variants: inherited.variants.map((v) => ({
      ...v,
      ...(o?.price
        ? {
            priceMinor: toMinorUnits(o.price.unitPrice, o.price.currency),
            currency: o.price.currency,
            posPriceMinor: v.priceMinor,
          }
        : {}),
    })),
  };
  return {
    categoryName: seed.categories.find((c) => c.id === p?.categoryId)?.name ?? 'Uncategorized',
    productId,
    listingId: listing?.id ?? null,
    title: source.title,
    source,
    inherited,
    quantity: source.soldOut ? '0' : '12',
    issues: listing?.issues ?? evaluateStorefrontReadiness(source).issues,
    images: inherited.images,
    soldOutBehavior: settings.soldOutBehavior,
  };
}
