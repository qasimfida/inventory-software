import { formatDecimalPrice } from '@inventory/domain';
import type { posItemsSchema } from '@inventory/contracts';
import type { z } from 'zod';
/** Indicative public base-unit price; customer pricing, tax and discounts are quoted at checkout. */
export function posPriceLabel(
  item: Pick<z.infer<typeof posItemsSchema>['items'][number], 'price'>,
) {
  if (!item.price) return 'Price unavailable';
  return `${formatDecimalPrice(item.price.unitPrice, item.price.currency)} / ${item.price.unit} · base price`;
}
