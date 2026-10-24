import { expect, it } from 'vitest';
import { parseAuthLink, authAppLink } from './auth-links.js';
const link = { kind: 'reset' as const, email: 'person@example.test', token: 'a'.repeat(43) };
it('accepts only configured HTTPS and the specific app scheme/path', () => {
  expect(parseAuthLink(authAppLink(link))).toEqual(link);
  expect(
    parseAuthLink(
      `https://app.example.test/auth/reset#email=person%40example.test&token=${link.token}`,
      'https://app.example.test',
    ),
  ).toEqual(link);
  for (const url of [
    `https://attacker.test/auth/reset#email=person%40example.test&token=${link.token}`,
    `inventory://auth.evil/reset#email=person%40example.test&token=${link.token}`,
    `inventory://auth/other#email=person%40example.test&token=${link.token}`,
    'inventory://auth/reset#email=person%40example.test&token=short',
    `https://user@app.example.test/auth/reset#email=person%40example.test&token=${link.token}`,
  ])
    expect(parseAuthLink(url, 'https://app.example.test')).toBeNull();
});
