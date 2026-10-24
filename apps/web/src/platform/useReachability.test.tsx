// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { demoController } from '@inventory/api-client/mock';
import { useReachability } from './useReachability';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
for (const scenario of ['normal', 'empty', 'error', 'offline'] as const)
  it(`isolates ${scenario} demo reachability from live requests`, async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    demoController.configure('owner', scenario);
    const { result } = renderHook(useReachability);
    await waitFor(() => expect(result.current).toBe(!['error', 'offline'].includes(scenario)));
    expect(fetch).not.toHaveBeenCalled();
  });
