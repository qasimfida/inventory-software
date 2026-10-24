// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { resolveApiOrigin } from './api-origin';

it('uses the Vite proxy for either browser loopback hostname, preserving Strict cookies', () => {
  for (const host of ['localhost', '127.0.0.1']) {
    expect(resolveApiOrigin('http://127.0.0.1:3100', `http://${host}:5173`, true, false)).toBe(
      `http://${host}:5173`,
    );
  }
});
it('keeps production and desktop on the explicitly configured API', () => {
  expect(
    resolveApiOrigin('https://api.example.test', 'https://app.example.test', false, false),
  ).toBe('https://api.example.test');
  expect(resolveApiOrigin('http://127.0.0.1:3100', 'tauri://localhost', true, true)).toBe(
    'http://127.0.0.1:3100',
  );
  expect(() => resolveApiOrigin('invalid', 'http://localhost', true, false)).toThrow();
});
