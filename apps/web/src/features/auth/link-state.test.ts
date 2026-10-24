// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { captureWebAuthLink, pendingAuthLink } from './link-state';
afterEach(() => {
  pendingAuthLink.clear();
  vi.restoreAllMocks();
});
it('removes malformed recovery credentials from the address before rendering', () => {
  window.history.replaceState(null, '', '/auth/reset#email=bad&token=invalid');
  captureWebAuthLink();
  expect(window.location.pathname + window.location.hash).toBe('/#/auth/link');
  expect(pendingAuthLink.get()).toBeNull();
});
it('leaves ordinary workspace navigation unchanged', () => {
  window.history.replaceState(null, '', '/#/catalog?search=chair');
  captureWebAuthLink();
  expect(window.location.hash).toBe('#/catalog?search=chair');
});
