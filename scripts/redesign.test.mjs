import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectRoutes, checkRows } from './route-coverage.mjs';
import { routeSources } from './redesign-routes.mjs';
import { read } from './redesign-source.mjs';
import { checkDocuments, guides } from './check-docs.mjs';
import { parse, pathAliases } from './parity-source.mjs';
const documents = () =>
  Object.fromEntries(
    guides.map((name, i) => [
      `docs/${name}.md`,
      `# Guide\n\n- **${['ARC', 'DS', 'SEC', 'DEV'][i]}-001** [review] Preserve behavior.\n`,
    ]),
  );
test('route report rejects a removed row', () => {
  assert.throws(
    () => checkRows('| `/pos` | ready |', [{ path: '/pos' }, { path: '/inventory' }]),
    /inventory/,
  );
});
test('live route registry requires reviewed entry-point evidence', () => {
  const sources = { ...routeSources };
  delete sources['/inventory'];
  assert.throws(() => collectRoutes(read, sources), /no reviewed row: \/inventory/);
});
test('canonical aliases are extracted only from canonical path assignment', () => {
  assert.deepEqual(
    pathAliases(
      parse(
        "const path = rawPath === '/old' ? '/new' : rawPath; const label = rawPath === '/fake' ? '/new' : '';",
        'test.ts',
      ),
    ),
    [['/old', '/new']],
  );
});
test('docs accept tagged rules and reject missing tags, duplicate IDs and oversized guides', () => {
  assert.deepEqual(checkDocuments(documents()), []);
  const d = documents();
  d['docs/architecture.md'] += '- Untagged instruction\n';
  assert.match(checkDocuments(d).join(), /tagged rule/);
  d['docs/design-system.md'] += '- **DS-001** [review] Duplicate.\n';
  assert.match(checkDocuments(d).join(), /duplicate/);
  d['docs/development.md'] += '\n'.repeat(200) + '# End';
  assert.match(checkDocuments(d).join(), /exceeds 200/);
});
test('docs reject broken links and unknown enforcement commands', () => {
  const d = documents();
  d['docs/security-and-data.md'] += '- **SEC-002** [review] [Missing](missing.md).\n';
  assert.match(checkDocuments(d, () => false).join(), /missing\/outside link/);
  d['docs/architecture.md'] += '- **ARC-002** [enforced: npm run nonexistent] Check.\n';
  assert.match(
    checkDocuments(
      d,
      () => false,
      () => '{"scripts":{}}',
    ).join(),
    /unknown enforcement/,
  );
});

test('an alias cannot hide a missing destination renderer', async () => {
  const { checkParity, sourcePaths } = await import('./check-parity.mjs');
  const result = checkParity((path) =>
    path === sourcePaths.mobile.panels
      ? read(path).replace("name: 'storage'", "name: 'missing-storage'")
      : read(path),
  );
  assert.ok(result.mismatches.some((line) => line.startsWith('/storage: missing mobile')));
  assert.ok(result.mismatches.some((line) => line.startsWith('/warehouse-view: missing mobile')));
});
