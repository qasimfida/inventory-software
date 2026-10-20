// @vitest-environment jsdom
vi.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
  randomUUID: () => crypto.randomUUID(),
}));
vi.mock('expo-print', () => ({ printAsync: vi.fn() }));
import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './App';

// Exercise the real entry/component; native bridges are replaced with browser/test equivalents.
const { registerRootComponent } = vi.hoisted(() => ({ registerRootComponent: vi.fn() }));
vi.mock('expo', () => ({ registerRootComponent }));
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device',
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock('react-native', () => vi.importActual('react-native-web'));

it('registers the mobile app and renders its browser-compatible native shell', async () => {
  await import('../index');
  expect(registerRootComponent).toHaveBeenCalledWith(App);
  expect(renderToStaticMarkup(createElement(App))).toContain('Inventory platform');
});
