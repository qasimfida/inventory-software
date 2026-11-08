import { describe, expect, it, vi } from 'vitest';
import { createCountClient } from './counts.js';
import { warehouseForms } from './warehouse-forms.js';

const id = '10000000-0000-4000-8000-000000000001';
describe('warehouse command characterization before presentation changes', () => {
  it.each(['submit', 'recount', 'approve'] as const)(
    'preserves %s version and stable uncertain retry identity',
    async (action) => {
      const request = vi.fn().mockRejectedValue(new Error('uncertain'));
      const key = vi.fn(() => id);
      const client = createCountClient(request, key, id);
      const input = { version: 7, reason: 'Reviewed against physical stock' };
      await expect(client.transition(id, action, input)).rejects.toThrow('uncertain');
      expect(request).toHaveBeenCalledTimes(1);
      await expect(client.transition(id, action, input)).rejects.toThrow('uncertain');
      expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
      expect(request.mock.calls[0]).toEqual([
        `/${id}/counts/${id}/${action}`,
        'POST',
        { ...input, idempotencyKey: id },
      ]);
      expect(key).toHaveBeenCalledTimes(1);
    },
  );
  it('sends an absolute fractional count without rounding or automatic retry', async () => {
    const request = vi.fn().mockRejectedValue(new Error('uncertain'));
    const client = createCountClient(request, () => id, id);
    await expect(
      client.capture(id, { variantId: id, unitId: id, quantity: '0.250001', version: 3 }),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[2]).toMatchObject({ quantity: '0.250001', version: 3 });
  });
  it('loading a movement confirmation never posts stock', async () => {
    const request = vi.fn().mockRejectedValue(new Error('uncertain'));
    const forms = await warehouseForms(request, () => id, id, {
      warehouseId: id,
      variantId: id,
      unitId: id,
      sourceId: id,
      destinationId: id,
      documentId: '',
      mode: 'move',
    });
    expect(request).not.toHaveBeenCalled();
    expect(forms.map((f) => f.title)).toEqual(['Confirm scanned location movement']);
    await expect(
      forms[0]!.submit({ quantity: '2.500001', reason: 'Physical bin movement' }),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[2]).toMatchObject({
      quantity: '2.500001',
      sourceId: id,
      destinationId: id,
    });
  });
});
