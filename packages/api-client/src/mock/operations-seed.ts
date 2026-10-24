import {
  supplierSchema,
  purchaseDetailSchema,
  transferDetailSchema,
  countDetailSchema,
  customerSchema,
  payableDetailSchema,
} from '@inventory/contracts';
import { demoDate, demoId } from './identity.js';
export function operationsSeed(id: (n: number) => string, currency: string) {
  const suppliers = ['Cedarworks Manufacturing', 'Luma Home Supply', 'Fieldstone Textiles'].map(
    (name, i) =>
      supplierSchema.parse({
        id: id(400 + i),
        name,
        code: `SUP-${i + 1}`,
        email: `orders${i + 1}@supplier.example.test`,
        phone: '+15550100000',
        notes: 'Scheduled weekly deliveries.',
        version: 1,
      }),
  );
  const purchases = [...Array.from({ length: 28 }).keys()].map((i) =>
    purchaseDetailSchema.parse({
      order: {
        id: id(500 + i),
        supplierId: suppliers[i % 3]!.id,
        warehouseId: id(3),
        currency,
        reference: `PO-2026-${1000 + i}`,
        state: i === 0 ? 'partially_received' : i % 3 === 0 ? 'draft' : 'ordered',
        version: 1,
        createdAt: demoDate(i % 10),
      },
      lines: [
        {
          id: id(600 + i),
          variantId: id(101),
          unitId: id(10),
          quantity: '20',
          unitCost: '18',
          baseQuantity: '20',
          received: i === 0 ? '8' : '0',
        },
      ],
      receipts:
        i === 0
          ? [
              {
                id: id(650),
                lineId: id(600),
                quantity: '8',
                returned: '1',
                damaged: '0',
                damageReason: '',
                actorId: demoId(901),
                createdAt: demoDate(1),
                movementId: id(651),
                locationId: id(20),
              },
            ]
          : [],
      returns:
        i === 0
          ? [
              {
                id: id(652),
                receiptId: id(650),
                quantity: '1',
                movementId: id(653),
                creditReference: 'CR-1048',
                reason: 'Packaging damage',
                damaged: '0',
              },
            ]
          : [],
      invoices:
        i === 0
          ? [
              {
                id: id(660),
                reference: 'INV-1048',
                amountMinor: '14400',
                dueDate: demoDate(5).slice(0, 10),
              },
            ]
          : [],
    }),
  );
  const transfers = [...Array.from({ length: 4 }).keys()].map((i) =>
    transferDetailSchema.parse({
      transfer: {
        id: id(700 + i),
        sourceWarehouseId: id(3),
        sourceLocationId: id(20),
        destinationWarehouseId: id(4),
        destinationLocationId: id(26),
        reference: `TR-${200 + i}`,
        state: ['draft', 'approved', 'dispatched', 'partially_received'][i],
        version: 1,
        createdAt: demoDate(i + 1),
      },
      lines: [
        {
          id: id(710 + i),
          variantId: id(101),
          unitId: id(10),
          quantity: '5',
          baseQuantity: '5',
          settled: i === 3 ? '2' : '0',
          reservationId: null,
        },
      ],
      events: [
        {
          id: id(720 + i),
          action: 'created',
          actorId: demoId(901),
          reason: 'Replenish reserve warehouse',
          createdAt: demoDate(i + 1),
        },
      ],
      receipts: [],
    }),
  );
  const counts = [
    countDetailSchema.parse({
      count: {
        id: id(750),
        warehouseId: id(3),
        locationId: id(20),
        blind: false,
        state: 'review',
        version: 2,
        createdBy: demoId(901),
        approvedBy: null,
        createdAt: demoDate(1),
        approvedAt: null,
      },
      lines: [
        {
          id: id(751),
          variantId: id(101),
          name: 'Linen lounge cushion',
          sku: 'HP-002',
          expected: '21',
          counted: '20',
          unitId: id(10),
          quantity: '20',
          countedBy: demoId(901),
          countedAt: demoDate(1),
          attempt: 1,
          stale: false,
        },
      ],
    }),
  ];
  const customers = [...Array.from({ length: 28 }).keys()].map((i) =>
    customerSchema.parse({
      id: id(800 + i),
      storeId: id(2),
      code: `CUS-${100 + i}`,
      name: `${['Amelia Hayes', 'Noah Bennett', 'Juniper Studio', 'Olivia Chen', 'The Willow Community Workshop and Education Collective'][i % 5]} ${i + 1}`,
      email: `customer${i + 1}@example.test`,
      currency,
      version: 1,
      creditEnabled: i % 2 === 0,
      creditHold: i === 0,
      creditLimitMinor: '50000',
      termsDays: 30,
      anonymized: false,
    }),
  );
  const payables = [
    payableDetailSchema.parse({
      invoice: {
        id: id(660),
        purchaseId: id(500),
        supplierId: id(400),
        supplierName: suppliers[0]!.name,
        warehouseId: id(3),
        currency,
        reference: 'INV-1048',
        dueDate: demoDate(5).slice(0, 10),
        amountMinor: '14400',
        creditMinor: '1800',
        paidMinor: '5000',
        refundedMinor: '0',
        outstandingMinor: '7600',
      },
      returns: [{ id: id(652), quantity: '1', creditReference: 'CR-1048' }],
      events: [
        {
          id: id(670),
          kind: 'payment',
          amountMinor: '5000',
          reference: 'CASH-1048',
          reason: 'Part payment',
          actorId: demoId(900),
          createdAt: demoDate(2),
          returnId: null,
          shiftId: id(950),
        },
        {
          id: id(671),
          kind: 'credit',
          amountMinor: '1800',
          reference: 'CR-1048',
          reason: 'Return credit',
          actorId: demoId(900),
          createdAt: demoDate(1),
          returnId: id(652),
          shiftId: null,
        },
      ],
      offset: 0,
      hasMore: false,
    }),
  ];
  return { suppliers, purchases, transfers, counts, customers, payables };
}
