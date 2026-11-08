import { expect, it, vi } from 'vitest';
import { ResourceModel } from './resource-model.js';
it('keeps loaded data and identifies a successful command followed by a failed reload', async () => {
  const load = vi
    .fn()
    .mockResolvedValueOnce({ price: '10' })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ price: '15' });
  const model = new ResourceModel(load);
  await model.run();
  const save = vi.fn(async () => {});
  await model.run(save, true);
  expect(model.snapshot().data).toEqual({ price: '10' });
  expect(model.snapshot().error).toContain('The action completed');
  await model.refresh();
  expect(save).toHaveBeenCalledTimes(1);
  expect(model.snapshot()).toEqual({ data: { price: '15' }, busy: false, error: '' });
});
it('does not report validation errors as connectivity failures or execute the loader after a failed write', async () => {
  const load = vi.fn(async () => ({}));
  const model = new ResourceModel(load);
  const { z } = await import('zod');
  await model.run(async () => {
    z.number().parse('bad');
  }, true);
  expect(model.snapshot().error).toContain('Check the required fields');
  expect(load).not.toHaveBeenCalled();
});
