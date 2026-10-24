// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthenticationError } from '@inventory/api-client';
import { useSession } from './useSession';
const { current } = vi.hoisted(() => ({ current: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({ authClient: { current } }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});
it('retains verified session on network loss only until original expiration', async () => {
  vi.useFakeTimers();
  const session = { sessionId: 'test', expiresAt: new Date(Date.now() + 120000).toISOString() };
  current.mockResolvedValue(session);
  const hook = renderHook(useSession);
  await act(async () => {});
  expect(hook.result.current.session).toEqual(session);
  current.mockRejectedValue(new TypeError('Failed to fetch'));
  await act(async () => {
    window.dispatchEvent(new Event('offline'));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(hook.result.current.session).toEqual(session);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(hook.result.current.session).toBeNull();
});
it('revalidates on reconnect and immediately clears a revoked session', async () => {
  current.mockResolvedValue({
    sessionId: 'test',
    expiresAt: new Date(Date.now() + 120000).toISOString(),
  });
  const hook = renderHook(useSession);
  await act(async () => {});
  current.mockRejectedValue(new AuthenticationError(401));
  await act(async () => {
    window.dispatchEvent(new Event('online'));
  });
  expect(hook.result.current.session).toBeNull();
});
