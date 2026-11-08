import { expect, it, vi } from 'vitest';
import { createIntegrationsClient } from './stage6.js';
import { workspaceRoutes } from './workspace-navigation.js';
const id = '00000000-0000-4000-8000-000000000001';
it('retains business.read authority and validates provider states without inferring activation', async () => {
  expect(workspaceRoutes.find((r) => r.path === '/integrations')?.permissions).toEqual([
    'business.read',
  ]);
  const status = {
    services: [
      { id: 'payments', state: 'local', detail: 'Cash only' },
      { id: 'ai', state: 'unconfigured', detail: 'Not installed' },
    ],
    navigation: ['Inventory'],
  };
  const request = vi.fn().mockResolvedValue(status);
  const client = createIntegrationsClient(request, id);
  expect(await client.load()).toEqual(status);
  expect(request).toHaveBeenCalledWith(`/${id}/integrations`);
  request.mockResolvedValue({
    ...status,
    services: [{ id: 'ai', state: 'connected', detail: 'Invalid' }],
  });
  await expect(client.load()).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(2);
});
it('rejects blank or oversized assistant questions before transport', async () => {
  const request = vi.fn();
  const client = createIntegrationsClient(request, id);
  for (const value of [' ', 'x'.repeat(2001)]) await expect(client.help(value)).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});
it('makes one assistant attempt, accepts explanation only and never requests records', async () => {
  const request = vi.fn().mockResolvedValue({ explanation: 'Open Inventory.' });
  const client = createIntegrationsClient(request, id);
  expect(await client.help('Where is inventory?')).toEqual({ explanation: 'Open Inventory.' });
  expect(request).toHaveBeenCalledWith(`/${id}/integrations/assistant`, 'POST', {
    question: 'Where is inventory?',
  });
  request.mockRejectedValue(new Error('offline'));
  await expect(client.help('Where is inventory?')).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(2);
});
