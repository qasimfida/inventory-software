import { expect, it, vi } from 'vitest';
import { createTradingClient } from './stage6.js';
import { tradingForms } from './trading-forms.js';
import { workspaceRoutes } from './workspace-navigation.js';
const id = '00000000-0000-4000-8000-000000000001',
  partner = '00000000-0000-4000-8000-000000000002';
const relationship = {
  id,
  proposerId: id,
  partnerId: partner,
  state: 'active' as const,
  version: 2,
};
const order = {
  id,
  relationshipId: id,
  buyerId: id,
  sellerId: partner,
  reference: 'ORDER-1',
  currency: 'USD' as const,
  lines: [],
  state: 'submitted' as const,
  version: 3,
  createdAt: '2026-11-06T12:00:00Z',
};
const page = {
  relationships: [relationship],
  orders: [order],
  offset: 0,
  hasMoreOrders: false,
  hasMoreRelationships: false,
};
it('keeps business.write as the route boundary', () => {
  expect(workspaceRoutes.find((r) => r.path === '/trading')?.permissions).toEqual([
    'business.write',
  ]);
});
it('offers creation only for active relationships and omits terminal orders', () => {
  const client = createTradingClient(vi.fn(), () => id, id);
  expect(
    tradingForms(client, { ...page, relationships: [], orders: [] }, id).map((f) => f.title),
  ).toEqual(['Invite trading partner']);
  expect(
    tradingForms(
      client,
      {
        ...page,
        relationships: [{ ...relationship, state: 'revoked' }],
        orders: [{ ...order, state: 'received' }],
      },
      id,
    ).map((f) => f.title),
  ).toEqual(['Invite trading partner']);
  expect(tradingForms(client, page, id).map((f) => f.title)).toEqual([
    'Invite trading partner',
    'Confirm relationship decision',
    'Submit shared order terms',
    'Confirm shared order status',
  ]);
});
it('submits exact shared terms and versioned decisions without stock or payment commands', async () => {
  const create = vi.fn(),
    transition = vi.fn();
  const client = { ...createTradingClient(vi.fn(), () => id, id), create, transition };
  const forms = tradingForms(client, page, id);
  await forms
    .find((f) => f.title === 'Submit shared order terms')!
    .submit({
      relationshipId: id,
      reference: 'ORDER-1',
      currency: 'USD',
      description: 'Shared terms',
      quantity: '999999999999.123456',
      unit: 'case',
      unitPriceMinor: '999999999999999',
    });
  expect(create).toHaveBeenCalledWith({
    relationshipId: id,
    reference: 'ORDER-1',
    currency: 'USD',
    lines: [
      {
        description: 'Shared terms',
        quantity: '999999999999.123456',
        unit: 'case',
        unitPriceMinor: '999999999999999',
      },
    ],
  });
  await forms
    .find((f) => f.title === 'Confirm shared order status')!
    .submit({ id, action: 'cancel', note: 'Buyer cancelled' });
  expect(transition).toHaveBeenCalledWith(id, {
    version: 3,
    action: 'cancel',
    note: 'Buyer cancelled',
  });
});
it('retains transition identity on explicit retry after uncertainty, with no automatic retry', async () => {
  const request = vi.fn().mockRejectedValue(new Error('offline'));
  const key = vi.fn(() => partner);
  const client = createTradingClient(request, key, id);
  const input = { action: 'accept' as const, version: 3, note: 'Terms accepted' };
  await expect(client.transition(id, input)).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  await expect(client.transition(id, input)).rejects.toThrow();
  expect(request.mock.calls[0]?.[2]).toEqual(request.mock.calls[1]?.[2]);
  expect(key).toHaveBeenCalledTimes(1);
});
it('loads only the requested history page and rejects invalid shared quantities before transport', async () => {
  const request = vi.fn().mockResolvedValue({ events: [], hasMore: false });
  const client = createTradingClient(request, () => partner, id);
  await client.history(id, 50);
  expect(request).toHaveBeenCalledWith(`/${id}/trading/orders/${id}/history?offset=50`);
  expect(() =>
    client.create({
      relationshipId: id,
      reference: 'ORDER-1',
      currency: 'USD',
      lines: [{ description: 'Item', quantity: '0', unit: 'each', unitPriceMinor: '100' }],
    }),
  ).toThrow();
  expect(request).toHaveBeenCalledTimes(1);
});
