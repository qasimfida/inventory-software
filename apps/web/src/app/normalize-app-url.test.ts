import { expect, it } from 'vitest';
import { normalizeAppUrl } from './normalize-app-url';
it('removes only legacy auth paths, preserving safe hash deep links', () => {
  expect(
    normalizeAppUrl({
      protocol: 'http:',
      pathname: '/auth',
      hash: '#/online-store/products?tab=ready',
    }),
  ).toBe('/#/online-store/products?tab=ready');
  expect(normalizeAppUrl({ protocol: 'https:', pathname: '/auth/login', hash: '' })).toBe(
    '/#/auth/login',
  );
  for (const pathname of ['/auth/reset', '/auth/invitation', '/app'])
    expect(normalizeAppUrl({ protocol: 'https:', pathname, hash: '#secret' })).toBeNull();
  expect(normalizeAppUrl({ protocol: 'tauri:', pathname: '/auth', hash: '#/pos' })).toBeNull();
});
