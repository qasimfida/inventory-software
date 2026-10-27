import { storefrontIssueMessages } from './storefront-messages.js';
import { z } from 'zod';
export const STOREFRONT_RULE_VERSION = 2;
export const STOREFRONT_TITLE_MIN = 2;
export const STOREFRONT_DESCRIPTION_MIN = 20;
export const listingIssueCodeSchema = z.enum([
  'TITLE_MISSING',
  'TITLE_TOO_SHORT',
  'DESCRIPTION_MISSING',
  'DESCRIPTION_TOO_SHORT',
  'NO_IMAGE',
  'IMAGE_URL_INVALID',
  'IMAGE_HOST_NOT_ALLOWED',
  'PRICE_MISSING',
  'PRICE_NOT_POSITIVE',
  'PRICE_CURRENCY_MISMATCH',
  'CATEGORY_MISSING',
  'SKU_MISSING',
  'UNIT_MISSING',
  'VARIANT_INCOMPLETE',
  'NO_STOCK_SOURCE',
  'PRODUCT_INACTIVE',
  'PRODUCT_ARCHIVED',
  'PRODUCT_NOT_FOUND',
  'SINGLE_IMAGE',
  'LOW_STOCK',
  'PRICE_BELOW_COST',
  'OVERRIDE_DIFFERS_FROM_POS_PRICE',
]);
export const listingIssueSchema = z
  .object({
    code: listingIssueCodeSchema,
    severity: z.enum(['error', 'warning']),
    field: z.string(),
    message: z.string(),
    params: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  })
  .strict();
export type ListingIssue = z.infer<typeof listingIssueSchema>;
export interface ReadinessVariant {
  id: string;
  sku: string;
  unit: string;
  complete: boolean;
  priceMinor: string | null;
  currency: string | null;
  costMinor?: string | null;
  posPriceMinor?: string | null;
}
export interface ReadinessInput {
  exists: boolean;
  state: string;
  title: string;
  description: string;
  images: string[];
  allowedHosts: readonly string[];
  category: boolean;
  currency: string;
  variants: ReadinessVariant[];
  hasStockSource: boolean;
  soldOut: boolean;
  lowStock: boolean;
}
/** Exact public DNS hosts only. This is syntax policy, not permission to fetch a URL. */
export function validImageHost(host: string): boolean {
  return (
    host.length <= 253 &&
    host === host.toLowerCase() &&
    /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) &&
    !/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
  );
}
export function imageUrlHost(value: string): string | null {
  if (!z.url({ protocol: /^https$/ }).safeParse(value).success) return null;
  const match = /^https:\/\/([a-zA-Z0-9.-]+)(?::443)?(?:[/?#]|$)/.exec(value);
  return match?.[1]?.toLowerCase() ?? null;
}
export function allowedImageUrl(value: string, hosts: readonly string[]): boolean {
  const host = imageUrlHost(value);
  return host !== null && hosts.includes(host);
}
/** Pure content/price evaluation. Stock availability never adds a blocking issue. */
export function evaluateStorefrontReadiness(input: ReadinessInput) {
  const issues: ListingIssue[] = [];
  const add = (
    code: ListingIssue['code'],
    field: string,
    message: string,
    severity: ListingIssue['severity'] = 'error',
    params: ListingIssue['params'] = {},
  ) => issues.push({ code, field, message, severity, params });
  if (!input.exists)
    add('PRODUCT_NOT_FOUND', 'productId', storefrontIssueMessages.PRODUCT_NOT_FOUND);
  else if (input.state === 'archived')
    add('PRODUCT_ARCHIVED', 'state', storefrontIssueMessages.PRODUCT_ARCHIVED);
  else if (input.state !== 'active')
    add('PRODUCT_INACTIVE', 'state', storefrontIssueMessages.PRODUCT_INACTIVE);
  if (!input.title.trim()) add('TITLE_MISSING', 'title', storefrontIssueMessages.TITLE_MISSING);
  else if (input.title.trim().length < STOREFRONT_TITLE_MIN)
    add('TITLE_TOO_SHORT', 'title', storefrontIssueMessages.TITLE_TOO_SHORT);
  if (!input.description.trim())
    add('DESCRIPTION_MISSING', 'description', storefrontIssueMessages.DESCRIPTION_MISSING);
  else if (input.description.trim().length < STOREFRONT_DESCRIPTION_MIN)
    add('DESCRIPTION_TOO_SHORT', 'description', storefrontIssueMessages.DESCRIPTION_TOO_SHORT);
  if (!input.images.length) add('NO_IMAGE', 'images', storefrontIssueMessages.NO_IMAGE);
  for (const [index, url] of input.images.entries()) {
    const valid = imageUrlHost(url) !== null;
    if (!valid)
      add('IMAGE_URL_INVALID', `images.${index}`, storefrontIssueMessages.IMAGE_URL_INVALID);
    else if (!allowedImageUrl(url, input.allowedHosts))
      add(
        'IMAGE_HOST_NOT_ALLOWED',
        `images.${index}`,
        storefrontIssueMessages.IMAGE_HOST_NOT_ALLOWED,
      );
  }
  if (input.images.length === 1)
    add('SINGLE_IMAGE', 'images', storefrontIssueMessages.SINGLE_IMAGE, 'warning');
  if (!input.category)
    add('CATEGORY_MISSING', 'categoryId', storefrontIssueMessages.CATEGORY_MISSING);
  if (!input.hasStockSource)
    add('NO_STOCK_SOURCE', 'stockSources', storefrontIssueMessages.NO_STOCK_SOURCE);
  const incomplete = input.variants
    .filter(
      (v) =>
        !v.complete ||
        !v.sku.trim() ||
        !v.unit.trim() ||
        v.priceMinor === null ||
        !/^-?\d+$/.test(v.priceMinor) ||
        BigInt(v.priceMinor) <= 0n ||
        v.currency !== input.currency,
    )
    .map((v) => v.id);
  if (!input.variants.length || incomplete.length)
    add('VARIANT_INCOMPLETE', 'variants', storefrontIssueMessages.VARIANT_INCOMPLETE, 'error', {
      variants: incomplete,
    });
  for (const v of input.variants) {
    const field = `variants.${v.id}`;
    if (!v.sku.trim()) add('SKU_MISSING', `${field}.sku`, storefrontIssueMessages.SKU_MISSING);
    if (!v.unit.trim()) add('UNIT_MISSING', `${field}.unit`, storefrontIssueMessages.UNIT_MISSING);
    if (v.priceMinor === null || !/^-?\d+$/.test(v.priceMinor))
      add('PRICE_MISSING', `${field}.price`, storefrontIssueMessages.PRICE_MISSING);
    else {
      if (BigInt(v.priceMinor) <= 0n)
        add('PRICE_NOT_POSITIVE', `${field}.price`, storefrontIssueMessages.PRICE_NOT_POSITIVE);
      if (v.currency !== input.currency)
        add(
          'PRICE_CURRENCY_MISMATCH',
          `${field}.currency`,
          storefrontIssueMessages.PRICE_CURRENCY_MISMATCH,
        );
      if (v.costMinor != null && BigInt(v.priceMinor) < BigInt(v.costMinor))
        add(
          'PRICE_BELOW_COST',
          `${field}.price`,
          storefrontIssueMessages.PRICE_BELOW_COST,
          'warning',
        );
      if (v.posPriceMinor != null && v.priceMinor !== v.posPriceMinor)
        add(
          'OVERRIDE_DIFFERS_FROM_POS_PRICE',
          `${field}.price`,
          storefrontIssueMessages.OVERRIDE_DIFFERS_FROM_POS_PRICE,
          'warning',
        );
    }
  }
  if (input.lowStock && !input.soldOut)
    add('LOW_STOCK', 'availability', storefrontIssueMessages.LOW_STOCK, 'warning');
  return {
    ruleVersion: STOREFRONT_RULE_VERSION,
    issues,
    ready: !issues.some((i) => i.severity === 'error'),
    availability: input.soldOut ? ('SOLD_OUT' as const) : ('IN_STOCK' as const),
  };
}
