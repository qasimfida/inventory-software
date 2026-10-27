import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkParity, sourcePaths } from './check-parity.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const replaced = (file, from, to) => (path) => {
  const source = read(path);
  if (path !== file) return source;
  assert.ok(source.includes(from), `Fixture anchor changed in ${file}`);
  return source.replace(from, to);
};
test('current registry, dispatchers and settings have parity', () => {
  const result = checkParity(read);
  assert.deepEqual(result.mismatches, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.registryCount, 40);
  assert.equal(result.coverage.web.settingsRoutes.size, 9);
});
test('missing native direct screen fails despite route strings elsewhere', () => {
  const result = checkParity(
    replaced(
      sourcePaths.mobile.dispatcher,
      "{path === '/team' && (",
      "{path === '/replacement-team' && (",
    ),
  );
  assert.ok(result.mismatches.some((line) => line.startsWith('/team: missing mobile')));
  assert.ok(result.mismatches.some((line) => line.startsWith('/replacement-team: missing web')));
});
test('missing web workflow panel fails', () => {
  const result = checkParity(
    replaced(sourcePaths.web.panels, "name: 'inventory'", "name: 'other-inventory'"),
  );
  assert.ok(result.mismatches.some((line) => line.startsWith('/inventory: missing web')));
  const empty = checkParity(
    replaced(sourcePaths.web.panels, 'Component: InventoryPanel', 'Component: null'),
  );
  assert.ok(empty.mismatches.some((line) => line.startsWith('/inventory: missing web')));
});
test('settings section removal fails on either platform', () => {
  for (const [platform, from, to] of [
    ['web', "section === 'preferences'", "section === 'other-preferences'"],
    ['mobile', "path === '/settings/preferences'", "path === '/settings/other-preferences'"],
  ]) {
    const result = checkParity(replaced(sourcePaths[platform].settings, from, to));
    assert.ok(
      result.mismatches.some((line) =>
        line.startsWith(`/settings/preferences: missing ${platform}`),
      ),
    );
  }
});
test('settings page added outside registry still fails', () => {
  const result = checkParity(
    replaced(sourcePaths.web.settings, "section === 'profile'", "section === 'new-page'"),
  );
  assert.ok(
    result.mismatches.some((line) => line.startsWith('/settings/new-page: missing mobile')),
  );
});
test('registered route absent from both dispatchers fails twice', () => {
  const result = checkParity(
    replaced(sourcePaths.registry, "path: '/dashboard'", "path: '/new-feature'"),
  );
  assert.equal(result.mismatches.filter((line) => line.startsWith('/new-feature:')).length, 2);
});
test('disconnected panel renderer fails all workflow routes', () => {
  const result = checkParity(
    replaced(sourcePaths.mobile.dispatcher, '{panels\n', '{otherPanels\n'),
  );
  assert.ok(result.mismatches.some((line) => line.startsWith('/catalog: missing mobile')));
});
test('disconnected settings renderer fails settings routes', () => {
  const result = checkParity(
    replaced(sourcePaths.web.dispatcher, '<SettingsPage />', '<OtherPage />'),
  );
  assert.equal(result.mismatches.filter((line) => line.startsWith('/settings/')).length, 9);
});
test('documented exact exceptions accepted; stale and invalid exceptions fail', () => {
  const fixture = replaced(
    sourcePaths.mobile.panels,
    'Component: InventoryPanel',
    'Other: InventoryPanel',
  );
  const exception = {
    path: '/inventory',
    missingOn: 'mobile',
    reason: 'Test only',
    followUp: 'Restore screen',
  };
  assert.equal(checkParity(fixture).mismatches.length, 1);
  const accepted = checkParity(fixture, [exception]);
  assert.equal(accepted.mismatches.length, 0);
  assert.equal(accepted.accepted.length, 1);
  assert.equal(checkParity(read, [exception]).errors.length, 1);
  assert.ok(checkParity(read, [{ path: '*' }]).errors.length > 0);
});
test('unknown registry syntax and invalid source fail closed', () => {
  assert.throws(() =>
    checkParity(
      replaced(
        sourcePaths.registry,
        'workspaceRoutes: WorkspaceRoute[] = [',
        'workspaceRoutes: WorkspaceRoute[] = unknown([',
      ),
    ),
  );
});
