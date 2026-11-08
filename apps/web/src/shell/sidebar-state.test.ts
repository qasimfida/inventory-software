// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { readSidebarLayout, saveSidebarLayout } from './sidebar-state';
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
it('retains collapse and bounded width on this device without account fields', () => {
  saveSidebarLayout(true, 320);
  expect(readSidebarLayout()).toEqual({ collapsed: true, width: 320 });
  saveSidebarLayout(false, 9999);
  expect(readSidebarLayout()).toEqual({ collapsed: false, width: 384 });
  expect(JSON.parse(localStorage.getItem('inventory.sidebar.layout')!)).not.toHaveProperty(
    'accountId',
  );
});
it('recovers from malformed or unavailable storage', () => {
  localStorage.setItem('inventory.sidebar.layout', '{');
  expect(readSidebarLayout()).toEqual({ collapsed: false, width: 248 });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(() => saveSidebarLayout(true, 300)).not.toThrow();
  expect(readSidebarLayout()).toEqual({ collapsed: false, width: 248 });
});
