import { expect, it } from 'vitest';
import { checkFixtureOwnership } from './fixture-ownership.js';
import { developmentAccounts, fixtureId } from './fixtures.js';
it('allows exactly the owned legacy fixture identities to upgrade', () => {
  const old = developmentAccounts
    .filter((a) => a.id !== fixtureId(8))
    .map((a) => ({ id: a.id, email: a.email.replace('@inv.com', '@example.test') }));
  expect(() => checkFixtureOwnership(old, true)).not.toThrow();
  expect(() => checkFixtureOwnership(developmentAccounts, true)).not.toThrow();
  expect(() => checkFixtureOwnership(old, false)).toThrow('ownership mismatch');
  expect(() =>
    checkFixtureOwnership([...old, { id: fixtureId(99), email: 'owner@inv.com' }], true),
  ).toThrow('ownership mismatch');
  expect(() => checkFixtureOwnership(old.slice(1), true)).toThrow('ownership mismatch');
  expect(() =>
    checkFixtureOwnership(
      old.map((a) => (a.id === fixtureId(2) ? { ...a, email: 'real@inv.com' } : a)),
      true,
    ),
  ).toThrow('ownership mismatch');
});
