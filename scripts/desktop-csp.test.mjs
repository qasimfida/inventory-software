import assert from 'node:assert/strict';
import test from 'node:test';
import { desktopImageSources } from './desktop-csp.mjs';

test('desktop images default closed and allow only explicitly configured origins', () => {
  assert.equal(desktopImageSources(), "'self' data:");
  assert.equal(
    desktopImageSources('https://media.example.test, https://media.example.test/'),
    "'self' data: https://media.example.test",
  );
  for (const origin of [
    'https:',
    'https://*.example.test',
    'http://media.example.test',
    'https://user:secret@example.test',
    'https://example.test/path',
    'https://example.test?query=1',
    'https://example.test/#fragment',
    'https://example.test; script-src *',
  ])
    assert.throws(() => desktopImageSources(origin));
});
