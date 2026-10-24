import { priceLine } from '@inventory/domain';
import { saleReceiptSchema, shiftSchema, saleQuoteSchema, cartSchema } from '@inventory/contracts';
import { demoDate, demoId } from './identity.js';
import type { catalogSeed } from './catalog-seed.js';
export function demoQuote(
  input: unknown,
  id: (n: number) => string,
  catalog: ReturnType<typeof catalogSeed>,
  currency: string,
) {
  const cart = cartSchema.parse(input);
  const lines = cart.lines.map((line) => {
    const product = catalog.products.find((p) => p.id === line.variantId),
      price = catalog.prices.find((p) => p.variantId === line.variantId);
    if (!product || !price || line.unitId !== id(10)) throw new Error('Unknown demo item or unit');
    const amounts = priceLine({
      quantity: line.quantity,
      unitPrice: price.unitPrice,
      currency,
      discountBasisPoints: line.manualDiscountBasisPoints,
      taxBasisPoints: 0,
      taxInclusive: false,
    });
    return {
      ...line,
      name: product.name,
      sku: product.sku,
      baseQuantity: line.quantity,
      unitPrice: price.unitPrice,
      priceId: price.id,
      promotionId: null,
      discountBasisPoints: line.manualDiscountBasisPoints,
      taxBasisPoints: 0,
      taxInclusive: false,
      ...amounts,
      trackInventory: true,
      available: catalog.balances.find((b) => b.variantId === line.variantId)?.available ?? '0',
      currency,
    };
  });
  const total = lines.reduce((sum, line) => sum + BigInt(line.totalMinor), 0n).toString();
  return saleQuoteSchema.parse({
    ...cart,
    storeId: id(2),
    currency,
    lines,
    netMinor: total,
    taxMinor: '0',
    totalMinor: total,
    quoteFingerprint: 'd'.repeat(64),
  });
}
export function commerceSeed(
  id: (n: number) => string,
  catalog: ReturnType<typeof catalogSeed>,
  currency: string,
) {
  const quote = demoQuote(
    { warehouseId: id(3), lines: [{ variantId: id(101), unitId: id(10), quantity: '2' }] },
    id,
    catalog,
    currency,
  );
  const sales = [...Array.from({ length: 28 }).keys()].map((i) =>
    saleReceiptSchema.parse({
      sale: {
        id: id(1000 + i),
        storeId: id(2),
        warehouseId: id(3),
        customerId: i === 0 ? id(800) : null,
        currency,
        netMinor: quote.netMinor,
        taxMinor: '0',
        totalMinor: quote.totalMinor,
        cashReceivedMinor: i === 0 ? '0' : quote.totalMinor,
        changeMinor: '0',
        state: 'completed',
        actorId: demoId(902),
        createdAt: demoDate(i % 7),
      },
      lines: quote.lines.map(({ available, currency: lineCurrency, ...line }, j) => {
        void available;
        void lineCurrency;
        return { ...line, id: id(1100 + i * 10 + j), movementId: id(1500 + i) };
      }),
      payments:
        i === 0
          ? []
          : [{ id: id(1600 + i), amountMinor: quote.totalMinor, reference: `CASH-${300 + i}` }],
      receivableId: i === 0 ? id(1700) : null,
      finance: {
        reconciled: true,
        outstandingMinor: i === 0 ? quote.totalMinor : '0',
        dueDate: i === 0 ? demoDate(8).slice(0, 10) : null,
        returns: [],
        refunds: [],
        returnedLines: [],
      },
    }),
  );
  const shifts = [
    shiftSchema.parse({
      id: id(950),
      warehouseId: id(3),
      terminalId: id(5),
      actorId: demoId(902),
      currency,
      openingMinor: '10000',
      expectedMinor: '10000',
      state: 'open',
      countedMinor: null,
      discrepancyMinor: null,
      openedAt: demoDate(),
      closedAt: null,
    }),
  ];
  return { sales, shifts };
}
