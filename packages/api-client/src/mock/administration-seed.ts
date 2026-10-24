import {
  businessInboxSchema,
  approvalQueueSchema,
  accountingPageSchema,
  tradingPageSchema,
  integrationStatusSchema,
  auditListSchema,
} from '@inventory/contracts';
import { demoDate, demoId } from './identity.js';
export function administrationSeed(id: (n: number) => string, currency: string) {
  const inbox = businessInboxSchema.parse({
    notifications: [
      'purchase.created',
      'stock.low',
      'count.submit',
      'transfer.dispatch',
      'settings.policy_changed',
    ].map((event, i) => ({
      id: id(1800 + i),
      event,
      resourceId: id(500),
      warehouseId: id(3),
      createdAt: demoDate(i),
      readAt: i > 2 ? demoDate() : null,
    })),
    nextCursor: null,
  });
  const approvals = approvalQueueSchema.parse({
    items: [
      {
        id: id(503),
        kind: 'purchase',
        reference: 'PO-2026-1003',
        state: 'draft',
        version: 1,
        warehouseId: id(3),
      },
      {
        id: id(750),
        kind: 'count',
        reference: 'Weekly aisle check',
        state: 'review',
        version: 2,
        warehouseId: id(3),
      },
    ],
    hasMore: false,
    offset: 0,
  });
  const accounting = accountingPageSchema.parse({
    periods: [
      { id: id(1900), from: demoDate(30).slice(0, 10), to: demoDate().slice(0, 10), state: 'open' },
    ],
    journals: [
      {
        id: id(1901),
        date: demoDate(1).slice(0, 10),
        currency,
        reason: 'Demonstration opening cash balance',
        sourceKind: 'manual',
        sourceId: null,
        reversalId: null,
        createdAt: demoDate(1),
        lines: [
          { account: '1000', debit: '10000', credit: '0' },
          { account: '3000', debit: '0', credit: '10000' },
        ],
      },
    ],
    pending: [
      {
        kind: 'sale',
        id: id(1000),
        date: demoDate().slice(0, 10),
        currency,
        amount: '6000',
        net: '6000',
        tax: '0',
        direction: 'payment',
      },
    ],
    balances: [
      { account: '1000', currency, debit: '10000', credit: '0' },
      { account: '3000', currency, debit: '0', credit: '10000' },
    ],
    hasMore: false,
    offset: 0,
  });
  const trading = tradingPageSchema.parse({
    relationships: [
      {
        id: id(2000),
        proposerId: id(1),
        partnerId: demoId(id(1) === demoId(1) ? 10001 : 1),
        state: 'active',
        version: 1,
      },
    ],
    orders: [
      {
        id: id(2001),
        relationshipId: id(2000),
        buyerId: id(1),
        sellerId: demoId(id(1) === demoId(1) ? 10001 : 1),
        reference: 'PARTNER-2026-018',
        currency,
        lines: [
          { description: 'Oak chair frames', quantity: '12', unit: 'EA', unitPriceMinor: '1800' },
        ],
        state: 'accepted',
        version: 2,
        createdAt: demoDate(3),
      },
    ],
    hasMoreRelationships: false,
    hasMoreOrders: false,
    offset: 0,
  });
  const integrations = integrationStatusSchema.parse({
    services: [
      {
        id: 'payments',
        state: 'unconfigured',
        detail: 'Cash only. No external provider is enabled.',
      },
      {
        id: 'notifications',
        state: 'local',
        detail: 'In-app demonstration inbox; no email or SMS is sent.',
      },
      { id: 'ai', state: 'unconfigured', detail: 'No AI provider configured.' },
    ],
    navigation: ['Catalog', 'Inventory', 'Purchasing', 'Reports'],
  });
  const audit = auditListSchema.parse({
    events: [
      {
        id: '1',
        actorId: demoId(900),
        resourceId: id(1),
        action: 'business.created',
        requestId: id(2100),
        occurredAt: demoDate(20),
        before: null,
        after: { name: 'Demonstration workspace' },
      },
    ],
    nextCursor: null,
  });
  return { inbox, approvals, accounting, trading, integrations, audit };
}
