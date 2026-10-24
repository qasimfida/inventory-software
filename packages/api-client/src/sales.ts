import type { CancellationSignal } from './cancellation.js';
import {
  saleReturnSchema,
  returnResultSchema,
  posItemsSchema,
  saleQuoteSchema,
  saleReceiptSchema,
  salePageSchema,
  saleQuerySchema,
  cartSchema,
  checkoutSchema,
} from '@inventory/contracts';
import type { SaleReturn, Cart, Checkout, SaleQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createSalesClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}`,
    commands = new RetryableCommands(request, newKey);
  return {
    items: async (q: Partial<SaleQuery>, signal?: CancellationSignal) =>
      posItemsSchema.parse(
        await request(
          `${path}/pos/items?${queryString(saleQuerySchema.parse(q))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    list: async (q: Partial<SaleQuery>, signal?: CancellationSignal) =>
      salePageSchema.parse(
        await request(
          `${path}/sales?${queryString(saleQuerySchema.parse(q))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    receipt: async (id: string) =>
      saleReceiptSchema.parse(await request(`${path}/sales/${encodeURIComponent(id)}/receipt`)),
    quote: async (input: Cart) =>
      saleQuoteSchema.parse(await request(`${path}/pos/quotes`, 'POST', cartSchema.parse(input))),
    returnSale: (id: string, input: Omit<SaleReturn, 'idempotencyKey'>) => {
      saleReturnSchema.parse({ ...input, idempotencyKey: '00000000-0000-4000-8000-000000000000' });
      return commands.run(`${path}/sales/${encodeURIComponent(id)}/returns`, input, (v) =>
        returnResultSchema.parse(v),
      );
    },
    checkout: (input: Omit<Checkout, 'idempotencyKey'>) => {
      const { idempotencyKey: discard, ...parsed } = checkoutSchema.parse({
        ...input,
        idempotencyKey: '00000000-0000-4000-8000-000000000000',
      });
      void discard;
      return commands.run(`${path}/sales`, parsed, (v) => saleReceiptSchema.parse(v));
    },
  };
}
