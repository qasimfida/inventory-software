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
  /** Read-only pricing is separate from the checkout mutation lock. */
  quoting?: boolean;
  busy: boolean;
  uncertain: boolean;
  error: string;
}

/** Missing stock is unknown, and untracked services are not sold out. */
export function isPosSoldOut(item: Pick<PosItem, 'available'>): boolean {
  return item.available != null && Number(item.available) <= 0;
}
