import { mkdirSync, writeFileSync } from 'node:fs';
import { files, symbols, imports, read, cell } from './redesign-source.mjs';
function classification(path) {
  const name = path.split('/').at(-1);
  if (/RichText|Form|Field|Editor|Choice|Select|Checkbox|Switch/.test(name)) return 'form';
  if (/Drawer|Dialog|Sheet|SidePanel|ResizeHandle|Popover/.test(name)) return 'dialog/drawer';
  if (/Search|Filter|CommandPalette/.test(name)) return 'search/filter';
  if (/Table|Collection|Pagination|LoadMore|Products|Directory/.test(name))
    return 'table/collection';
  if (/Chart|Trend|DashboardSales/.test(name)) return 'chart';
  if (/AsyncState|Skeleton|Toast|Notice|Alert|Badge|Error|Loading/.test(name)) return 'feedback';
  if (/Nav|Sidebar|Menu|Tabs|WorkspaceSwitch|ProfileIdentity/.test(name)) return 'navigation';
  if (/pos\/|Cart|Checkout/.test(path)) return 'POS-specific';
  if (/shell\/|layout\/|Layout|Viewport|Surface/.test(path)) return 'layout';
  if (/components\/ui\/|ui\/(Controls|Themed|Action|Icon|NativeIcon)/.test(path))
    return 'primitive';
  return 'data display';
}
const roots = ['apps/web/src', 'apps/mobile/src'];
const all = roots
  .flatMap(files)
  .filter((p) => p.endsWith('.tsx') && !/\.test\.|test-adapter/.test(p));
const rows = all.map((path) => {
  const names = symbols(path),
    kind = classification(path),
    size = read(path).split('\n').length;
  const native = path.startsWith('apps/mobile');
  const match = all.find(
    (p) =>
      p !== path &&
      p.split('/').at(-1) === path.split('/').at(-1) &&
      p.startsWith(native ? 'apps/web' : 'apps/mobile'),
  );
  const status =
    size > 200
      ? 'improve'
      : /components\/ui\/|ui\/(Themed|Controls|NativeIcon)/.test(path)
        ? 'keep'
        : /Form|RecordCollection|AsyncState/.test(path)
          ? 'consolidate'
          : 'refine';
  return {
    path,
    names,
    kind,
    platform: native ? 'native equivalent' : 'web / Tauri',
    status,
    size,
    match,
    dependencies: imports(path),
    rationale:
      size > 200
        ? 'Review cohesion and duplicated composition before visual work; no automatic split.'
        : status === 'keep'
          ? 'Retain existing accessible primitive and token integration; verify new preference consumers.'
          : status === 'consolidate'
            ? 'Consolidate callers onto existing pattern; preserve validation, requests and actions.'
            : 'Refine using shared tokens after baseline; no business behavior change.',
  };
});
const out = '.ai/reports/redesign';
mkdirSync(out, { recursive: true });
writeFileSync(
  `${out}/components.md`,
  [
    '# Phase 1 component matrix',
    '',
    'Generated source-level triage, not visual approval. Every non-test TSX module is listed, including context/composition modules with no exported visual component. Classification is a review aid, not a replacement mandate. No deprecation or library replacement is approved.',
    '',
    '| Source / component and composition symbols | Classification | Platform / counterpart | Disposition | Evidence / risk |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| \`${r.path}\`<br>${cell(r.names.join(', ') || 'internal/default composition')} | ${r.kind} | ${r.platform}; ${r.match ? `\`${r.match}\`` : 'no same-name counterpart; inspect composition'} | ${r.status} | ${r.size} lines. ${r.rationale} |`,
    ),
    '',
    '## Ownership hotspots',
    '',
    '- Consolidate repeated .pos-cart, .inventory-product-card and .product-grid declarations across catalog-cart.css, operational-ui.css, shell-controls.css and inventory-refinement.css before redesigning those patterns.',
    '- Keep contracts/API models authoritative; native equivalents need matching semantics, not identical DOM APIs.',
    '- Preserve Quill sanitized rich description format and native WebView integration. Test actual devices before qualification.',
    '- Deprecate only after a verified consumer migration; no current component is approved for removal.',
    '',
  ].join('\n'),
);
writeFileSync(`${out}/components.json`, JSON.stringify(rows, null, 2) + '\n');
console.log(
  `${rows.length} TSX modules classified with component/composition symbols and source dependencies.`,
);
