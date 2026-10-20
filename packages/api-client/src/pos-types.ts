import type { Cart, SaleQuote } from '@inventory/contracts';
import type { createSalesClient } from './sales.js';
type Client = ReturnType<typeof createSalesClient>;
export type PosItem = Awaited<ReturnType<Client['items']>>['items'][number];
export type DraftLine = Cart['lines'][number] & Pick<PosItem, 'name' | 'sku' | 'units'>;
export interface PosState {
  lines: DraftLine[];
  customerId: string | null;
  quote: SaleQuote | null;
  receipt: Awaited<ReturnType<Client['receipt']>> | null;
  busy: boolean;
  uncertain: boolean;
  error: string;
}
