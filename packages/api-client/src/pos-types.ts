import type { Cart, SaleQuote } from '@inventory/contracts';
import type { createSalesClient } from './sales.js';
type Client = ReturnType<typeof createSalesClient>;
export type PosItem = Awaited<ReturnType<Client['items']>>['items'][number];
export type DraftLine = Cart['lines'][number] & Pick<PosItem, 'name' | 'sku' | 'units' | 'images'>;
export interface HeldCart {
  name: string;
  lines: DraftLine[];
  customerId: string | null;
}
export interface PosState {
  heldCarts: HeldCart[];
  lines: DraftLine[];
  customerId: string | null;
  quote: SaleQuote | null;
  receipt: Awaited<ReturnType<Client['receipt']>> | null;
  busy: boolean;
  uncertain: boolean;
  error: string;
}
