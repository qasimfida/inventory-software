import {
  storefrontIssueMessages,
  channelListingSchema,
  listingIssueCodeSchema,
  onlineStoreSettingsSchema,
} from '@inventory/contracts';
import type { DemoSeed } from './seed.js';
export function storefrontManagementSeed(seed: DemoSeed, storeId: string) {
  const settings = onlineStoreSettingsSchema.parse({
    businessId: seed.business.id,
    storeId,
    name: seed.business.name,
    slug: `demo-${storeId.slice(-6)}`,
    currency: seed.currency,
    enabled: false,
    status: 'configured',
    contact: { email: 'store@example.com', phone: '', address: 'Demonstration address' },
    fulfillment: {
      pickup: { enabled: true, locationId: storeId, instructions: 'Collect in store', hours: '' },
      cashOnDelivery: false,
      manualBankTransfer: { enabled: false, instructions: '' },
    },
    returnPolicy: 'Return unopened products within seven days.',
    shippingPolicy: '',
    stockSources: seed.locations
      .filter((l) => l.kind === 'warehouses' && l.storeId === storeId)
      .map((l) => l.id),
    safetyBuffer: '0',
    soldOutBehavior: 'show',
    allowedImageHosts: ['images.example.com'],
    version: 1,
  });
  const items = Array.from({ length: 36 }, (unused, i) => {
    void unused;
    const code = listingIssueCodeSchema.options[i % listingIssueCodeSchema.options.length]!;
    const warning = [
      'SINGLE_IMAGE',
      'LOW_STOCK',
      'PRICE_BELOW_COST',
      'OVERRIDE_DIFFERS_FROM_POS_PRICE',
    ].includes(code);
    const issue =
      i < 22
        ? {
            code,
            severity: warning ? 'warning' : 'error',
            field: code.startsWith('TITLE')
              ? 'title'
              : code.startsWith('DESCRIPTION')
                ? 'description'
                : code.includes('IMAGE')
                  ? 'images'
                  : code.startsWith('PRODUCT')
                    ? 'state'
                    : code === 'NO_STOCK_SOURCE'
                      ? 'stockSources'
                      : code === 'CATEGORY_MISSING'
                        ? 'categoryId'
                        : 'variants.' + seed.products[i % seed.products.length]!.id + '.price',
            message: storefrontIssueMessages[code],
            params: {},
          }
        : null;
    return channelListingSchema.parse({
      id: seed.id(8000 + i),
      businessId: seed.business.id,
      storeId,
      productId: seed.products[i % seed.products.length]!.id,
      variantId: null,
      status:
        issue && !warning
          ? 'needs_changes'
          : i % 3 === 0
            ? 'paused'
            : i % 3 === 1
              ? 'active'
              : 'ready',
      issues: issue ? [issue] : [],
      ruleVersion: 2,
      overrides: {
        title: null,
        description: null,
        images: null,
        price: i === 21 ? { unitPrice: '25', currency: seed.currency } : null,
        visible: true,
      },
      publishedAt: null,
      pausedAt: (!issue || warning) && i % 3 === 0 ? new Date().toISOString() : null,
      lastValidatedAt: new Date().toISOString(),
      version: 1,
      title: `Demo listing ${i + 1}`,
      availability: i % 7 === 0 ? 'SOLD_OUT' : 'IN_STOCK',
    });
  });
  return {
    settings,
    configured: true,
    items,
    history: [] as Array<{
      id: string;
      listingId: string;
      actorId: string | null;
      transition: string;
      reasonCode: string;
      before: Record<string, unknown>;
      after: Record<string, unknown>;
      timestamp: string;
    }>,
    receipts: new Map<string, { payload: string; result: unknown }>(),
  };
}
