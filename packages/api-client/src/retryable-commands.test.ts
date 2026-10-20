import { expect, it, vi } from 'vitest';
import { RetryableCommands } from './retryable-commands.js';
it('retains operation identity across uncertain failures and canonicalizes equivalent payloads', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValue({ ok: true });
  const key = vi.fn().mockReturnValue('stable-key');
  const commands = new RetryableCommands(request, key);
  await expect(commands.run('/movement', { a: 1, b: 2 }, (v) => v)).rejects.toThrow();
  await commands.run('/movement', { b: 2, a: 1 }, (v) => v);
  expect(key).toHaveBeenCalledTimes(1);
  expect(
    request.mock.calls.map((call) => (call[2] as { idempotencyKey: string }).idempotencyKey),
  ).toEqual(['stable-key', 'stable-key']);
});
