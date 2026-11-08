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
  vi.restoreAllMocks();
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
it('keeps the same workspace session on hide/return and coalesces simultaneous focus checks', async () => {
  const session = { sessionId: 'test', expiresAt: new Date(Date.now() + 120000).toISOString() };
  current.mockResolvedValue(session);
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const hook = renderHook(useSession);
  await act(async () => {});
  const verified = hook.result.current.session;
  let resolve: (value: typeof session) => void = () => {};
  current.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  hidden.mockReturnValue(true);
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(hook.result.current.session).toBe(verified);
  hidden.mockReturnValue(false);
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  expect(current).toHaveBeenCalledTimes(2);
  expect(hook.result.current.session).toBe(verified);
  expect(hook.result.current.busy).toBe(false);
  await act(async () => {
    resolve({ ...session });
  });
  expect(hook.result.current.session).toBe(verified);
  hidden.mockRestore();
});
it('clears an expired session on return even before its suspended timer runs', async () => {
  const start = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
  current.mockResolvedValue({
    sessionId: 'test',
    expiresAt: new Date(start + 120000).toISOString(),
  });
  const hook = renderHook(useSession);
  await act(async () => {});
  current.mockImplementationOnce(() => new Promise(() => {}));
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  clock.mockReturnValue(start + 120001);
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(hook.result.current.session).toBeNull();
  clock.mockRestore();
});
it('does not let a late focus check restore a session after sign-out', async () => {
  const session = { sessionId: 'test', expiresAt: new Date(Date.now() + 120000).toISOString() };
  current.mockResolvedValue(session);
  const hook = renderHook(useSession);
  await act(async () => {});
  let resolve: (value: typeof session) => void = () => {};
  current.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  await act(async () => {
    await hook.result.current.run(async () => null);
  });
  await act(async () => {
    resolve(session);
  });
  expect(hook.result.current.session).toBeNull();
});
