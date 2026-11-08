import { expect, it, vi } from 'vitest';
import { strToU8 } from 'fflate';
import { ImportWorkflow } from './import-workflow.js';
const file = strToU8('sku,name,price,currency\nABC,Paint,12.50,USD');
function fixture() {
  const client = {
    templates: vi.fn().mockResolvedValue([]),
    saveTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    validate: vi.fn().mockResolvedValue({ errors: [] }),
    execute: vi.fn().mockResolvedValue({ created: 1, products: ['product'] }),
  };
  return { client, model: new ImportWorkflow(client, () => crypto.randomUUID()) };
}
it('never imports on upload, mapping or validation; edits invalidate confirmation', async () => {
  const { client, model } = fixture();
  await model.load(file, 'sample.csv');
  expect(model.snapshot().step).toBe('preview');
  expect(client.execute).not.toHaveBeenCalled();
  model.navigate('mapping');
  await model.validate();
  expect(model.snapshot().validated).toBe(true);
  model.edit({ warehouseId: crypto.randomUUID() });
  await model.confirm();
  expect(client.execute).not.toHaveBeenCalled();
  await model.validate();
  await model.confirm();
  expect(client.execute).toHaveBeenCalledTimes(1);
  expect(model.snapshot().result?.created).toBe(1);
  await model.confirm();
  expect(client.execute).toHaveBeenCalledTimes(1);
});
it('freezes uncertain imports and retries the same payload/key without repeating automatically', async () => {
  const { client, model } = fixture();
  client.execute.mockRejectedValueOnce(new Error('Connection lost'));
  await model.load(file, 'sample.csv');
  await model.validate();
  await model.confirm();
  expect(model.snapshot().uncertain).toBe(true);
  expect(client.execute).toHaveBeenCalledTimes(1);
  const first = client.execute.mock.calls[0]![0];
  model.edit({ warehouseId: 'different' });
  await model.load(file, 'other.csv');
  model.reset();
  expect(model.snapshot().source?.name).toBe('sample.csv');
  await model.confirm();
  expect(client.execute.mock.calls[1]![0]).toEqual(first);
  expect(model.snapshot().result?.created).toBe(1);
});
it('blocks invalid data before server validation and exposes template mismatch', async () => {
  const { client, model } = fixture();
  await model.load(strToU8('sku,name,price,currency\nABC,Paint,-1,USD'), 'bad.csv');
  await model.validate();
  expect(client.validate).not.toHaveBeenCalled();
  expect(model.snapshot().errors[0]?.field).toBe('price');
  client.templates.mockResolvedValue([
    {
      id: 'id',
      version: 1,
      name: 'Old file',
      mapping: {
        sku: 'old',
        name: 'name',
        price: 'price',
        currency: 'currency',
        description: '',
        quantity: '',
      },
    },
  ]);
  await model.loadTemplates();
  model.selectTemplate('id');
  await model.validate();
  expect(model.snapshot().message).toContain('missing');
});
it('failed replacement files invalidate prior validation and known rejection allows correction', async () => {
  const { client, model } = fixture();
  await model.load(file, 'sample.csv');
  await model.validate();
  client.execute.mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
  await model.confirm();
  expect(model.snapshot().uncertain).toBe(false);
  expect(model.snapshot().validated).toBe(false);
  await model.load(strToU8('invalid'), 'bad.csv');
  expect(model.snapshot().source).toBeNull();
  await model.confirm();
  expect(client.execute).toHaveBeenCalledTimes(1);
});
it('does not forget an uncertain committed batch when a later replay is denied', async () => {
  const { client, model } = fixture();
  client.execute
    .mockRejectedValueOnce(new Error('Lost response'))
    .mockRejectedValueOnce(Object.assign(new Error('Permissions changed'), { status: 403 }));
  await model.load(file, 'sample.csv');
  await model.validate();
  await model.confirm();
  await model.confirm();
  expect(model.snapshot().uncertain).toBe(true);
  model.reset();
  expect(model.snapshot().source?.name).toBe('sample.csv');
  expect(client.execute.mock.calls[0]![0]).toEqual(client.execute.mock.calls[1]![0]);
});
