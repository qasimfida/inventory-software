import { describe, it, expect, vi } from 'vitest';
import { createAccountingClient, createIntegrationsClient } from './stage6.js';
describe('accounting and assistant clients', () => {
  it('retains a journal mutation identity after an ambiguous transport failure', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Connection lost'));
    const client = createAccountingClient(
      request,
      () => '01935b16-64e0-4444-8444-123456789abc',
      '01935b16-64e0-4444-8444-123456789def',
    );
    const input = { from: '2026-01-01', to: '2026-12-31' };
    await expect(client.period(input)).rejects.toThrow();
    await expect(client.period(input)).rejects.toThrow();
    expect(request.mock.calls[0]?.[2]).toEqual(request.mock.calls[1]?.[2]);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('does not retry an assistant request and validates provider output', async () => {
    const request = vi.fn().mockResolvedValue({ explanation: 'Help', secret: 'must not pass' });
    const client = createIntegrationsClient(request, '01935b16-64e0-4444-8444-123456789def');
    await expect(client.help('Where are reports?')).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
