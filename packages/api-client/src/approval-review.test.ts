import { expect, it } from 'vitest';
import { createApprovalReviewClient } from './approval-review.js';
import type { OrganizationTransport } from './organization.js';
it('reviews server versions and reuses the same mutation key after an ambiguous response', async () => {
  const id = '00000000-0000-4000-8000-000000000001',
    keys: string[] = [];
  const detail = {
    order: {
      id,
      supplierId: id,
      warehouseId: id,
      currency: 'USD',
      reference: 'PO-1',
      state: 'draft',
      version: 4,
      createdAt: '2026-10-20T00:00:00Z',
    },
    lines: [],
    receipts: [],
    returns: [],
    invoices: [],
  };
  const request: OrganizationTransport = async (path, method, body) => {
    expect(path).toContain(id);
    if (method === 'POST') {
      keys.push((body as { idempotencyKey: string }).idempotencyKey);
      throw new Error('connection lost');
    }
    return detail;
  };
  let sequence = 0;
  const client = createApprovalReviewClient(request, () => `${id.slice(0, -1)}${++sequence}`, id),
    review = await client.load('purchase', id);
  expect(review.state).toBe('draft');
  expect(review.approve).toBeTruthy();
  await expect(review.approve!('Reviewed original order')).rejects.toThrow();
  await expect(review.approve!('Reviewed original order')).rejects.toThrow();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});
