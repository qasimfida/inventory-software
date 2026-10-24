// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { demoController } from '@inventory/api-client/mock';
import { useReachability } from './useReachability';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
for (const scenario of ['normal', 'empty', 'error', 'offline'] as const)
  it(`isolates ${scenario} demo reachability from live requests`, async () => {
    vi.stubGlobal('__DEV__', true);
    vi.stubEnv('EXPO_PUBLIC_USE_MOCKS', 'true');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    demoController.configure('owner', scenario);
    const { result } = renderHook(useReachability);
    await waitFor(() => expect(result.current).toBe(!['error', 'offline'].includes(scenario)));
    expect(fetch).not.toHaveBeenCalled();
  });
