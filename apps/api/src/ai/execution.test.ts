import { afterEach, expect, it, vi } from 'vitest';
import { executeProvider } from './execution.js';
import { parseAiConfiguration } from './configuration.js';
import { ProviderFailure } from './provider.js';
import type { AiProvider } from './provider.js';
afterEach(() => vi.useRealTimers());
it('rejects malformed/action outputs, classifies failures and bounds time without retries', async () => {
  const config = parseAiConfiguration({ AI_TIMEOUT_MS: 100 });
  const request = {
    model: 'test',
    system: 'policy',
    untrustedInput: { question: 'help', allowedSections: [] },
    maxOutputTokens: 64,
  };
  for (const output of [{ explanation: 'ok', action: 'refund' }, { explanation: '' }]) {
    const provider = { id: 'test', generate: vi.fn().mockResolvedValue({ output }) };
    await expect(executeProvider(provider, request, config)).rejects.toMatchObject({
      code: 'AI_INVALID_OUTPUT',
    });
    expect(provider.generate).toHaveBeenCalledTimes(1);
  }
  const failure = {
    id: 'test',
    generate: vi.fn().mockRejectedValue(new ProviderFailure('rate_limit')),
  };
  await expect(executeProvider(failure, request, config)).rejects.toMatchObject({
    code: 'AI_RATE_LIMITED',
    retryable: true,
  });
  failure.generate.mockRejectedValue(new Error('private provider response'));
  await expect(executeProvider(failure, request, config)).rejects.toMatchObject({
    message: 'AI_PROVIDER_FAILED',
  });
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const slow: AiProvider = {
    id: 'test',
    generate: (input) => {
      signal = input.signal;
      return new Promise(() => {});
    },
  };
  const pending = expect(executeProvider(slow, request, config)).rejects.toMatchObject({
    code: 'AI_TIMEOUT',
  });
  await vi.advanceTimersByTimeAsync(100);
  await pending;
  expect(signal?.aborted).toBe(true);
});
