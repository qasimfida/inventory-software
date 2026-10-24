// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { browserApiOrigin } from './api-origin.web';

it('keeps Expo web development loopback cookies same-site without rewriting production or remote APIs', () => {
  expect(browserApiOrigin('http://127.0.0.1:3100', 'http://localhost:8081', true)).toBe(
    'http://localhost:3100',
  );
  expect(browserApiOrigin('http://localhost:3100', 'http://127.0.0.1:8081', true)).toBe(
    'http://127.0.0.1:3100',
  );
  expect(browserApiOrigin('https://api.example.test', 'http://localhost:8081', true)).toBe(
    'https://api.example.test',
  );
  expect(browserApiOrigin('http://127.0.0.1:3100', 'http://localhost:8081', false)).toBe(
    'http://127.0.0.1:3100',
  );
});
