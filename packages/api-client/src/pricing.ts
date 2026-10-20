import {
  pricingWorkspaceSchema,
  unitSchema,
  variantSchema,
  priceSchema,
  promotionSchema,
  quoteSchema,
} from '@inventory/contracts';
import type {
  UnitInput,
  VariantInput,
  VariantEdit,
  Conversion,
  PriceInput,
  PromotionInput,
  QuoteInput,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
export function createPricingClient(
  request: OrganizationTransport,
  businessId: string,
  productId: string,
) {
  const path = `/${encodeURIComponent(businessId)}`;
  return {
    load: async () =>
      pricingWorkspaceSchema.parse(
        await request(`${path}/products/${encodeURIComponent(productId)}/pricing`),
      ),
    unit: async (input: UnitInput) =>
      unitSchema.parse(await request(`${path}/units`, 'POST', input)),
    variant: async (input: VariantInput) =>
      variantSchema.parse(
        await request(`${path}/products/${encodeURIComponent(productId)}/variants`, 'POST', input),
      ),
    editVariant: async (id: string, input: VariantEdit) =>
      variantSchema.parse(
        await request(`${path}/variants/${encodeURIComponent(id)}`, 'PATCH', input),
      ),
    conversion: async (id: string, input: Conversion) =>
      request(`${path}/variants/${encodeURIComponent(id)}/conversions`, 'POST', input),
    price: async (input: PriceInput) =>
      priceSchema.parse(await request(`${path}/prices`, 'POST', input)),
    promotion: async (input: PromotionInput) =>
      promotionSchema.parse(await request(`${path}/promotions`, 'POST', input)),
    withdraw: async (id: string) =>
      request(`${path}/promotions/${encodeURIComponent(id)}/withdraw`, 'POST', {}),
    quote: async (input: QuoteInput) =>
      quoteSchema.parse(await request(`${path}/price-quotes`, 'POST', input)),
  };
}
