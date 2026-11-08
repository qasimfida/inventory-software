import { expect, it, vi } from 'vitest';
import { transferDetailSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { createTransferClient } from './transfers.js';
import { transferDetailForms } from './transfer-forms.js';
const detail = transferDetailSchema.parse(createDemoSeed(0, 'owner').transfers[0]);
it.each([
  ['draft', ['approve', 'cancel']],
  ['approved', ['dispatch', 'cancel']],
  ['dispatched', ['Confirm destination receipt']],
  ['partially_received', ['Confirm destination receipt']],
  ['completed', []],
  ['cancelled', []],
] as const)('preserves available commands for %s', (state, actions) => {
  const client = createTransferClient(vi.fn(), () => 'key', 'business');
  const forms = transferDetailForms(client, { ...detail, transfer: { ...detail.transfer, state } });
  expect(forms.map((f) => f.title)).toEqual(
    actions.map((a) =>
      a.startsWith('Confirm') ? a : `${a} transfer ${detail.transfer.reference}`,
    ),
  );
});
it('keeps versioned dispatch single-attempt with stable uncertain retry identity', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const key = vi.fn(() => 'stable-transfer-key');
  const client = createTransferClient(request, key, 'business');
  const input = { action: 'dispatch' as const, version: 7, reason: 'Physical dispatch verified' };
  await expect(client.transition(detail.transfer.id, input)).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  await expect(client.transition(detail.transfer.id, input)).rejects.toThrow();
  expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  expect(request.mock.calls[0]?.[2]).toEqual({ ...input, idempotencyKey: 'stable-transfer-key' });
  expect(key).toHaveBeenCalledTimes(1);
});
it('preserves good, damaged and shortage quantities separately without rounding', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const client = createTransferClient(request, () => 'receipt-key', 'business');
  const forms = transferDetailForms(client, {
    ...detail,
    transfer: { ...detail.transfer, state: 'partially_received' },
  });
  const input = {
    lineId: detail.lines[0]!.id,
    received: '0.250001',
    damaged: '0.000001',
    shortage: '1.000001',
    reason: 'Physical discrepancy confirmed',
  };
  await expect(forms[0]!.submit(input)).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[2]).toEqual({ ...input, idempotencyKey: 'receipt-key' });
});
