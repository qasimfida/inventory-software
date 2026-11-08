import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { files } from './redesign-source.mjs';

// Static regression guard, not an accessibility or computed-style proof.
export function findings(path, source) {
  const result = [];
  const add = (kind, value, pos) =>
    result.push({
      path,
      kind,
      value: value.replace(/\s+/g, ' ').trim(),
      line: source.slice(0, pos).split('\n').length,
    });
  const component = /\/components\/(ui|common)\/|\/ui\//.test(path);
  if (path.endsWith('.css')) {
    const clean = source
      .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
      .replace(/@font-face\s*\{[^}]*\}/g, (m) =>
        m.replace(/font-family\s*:[^;]+;/g, (declaration) => ' '.repeat(declaration.length)),
      );
    for (const match of clean.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)) {
      const [, prop, value] = match;
      if (/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(value)) add('raw-color', match[0], match.index);
      if (
        /^(?:border-radius|box-shadow|font-family|font-size|transition|animation|transition-duration|animation-duration|z-index|width|height|min-width|min-height|max-width|max-height|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?)$/.test(
          prop,
        ) &&
        !/var\(/.test(value) &&
        !/^(?:0|none|inherit|auto|100%|fit-content|max-content|min-content)$/.test(value.trim())
      )
        add('literal-design-value', match[0], match.index);
    }
    return result;
  }
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const walk = (node) => {
    if (
      !component &&
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      /^(button|input|select|textarea)$/.test(node.tagName.getText(ast))
    )
      add('raw-control', node.tagName.getText(ast), node.getStart(ast));
    if (ts.isPropertyAssignment(node)) {
      const key = node.name.getText(ast).replace(/['"]/g, '');
      const value = node.initializer.getText(ast);
      if (
        /^(color|backgroundColor|borderColor|shadowColor|fill|stroke)$/.test(key) &&
        ts.isStringLiteral(node.initializer) &&
        !/^(transparent|currentColor)$/.test(node.initializer.text)
      )
        add('literal-color', node.getText(ast), node.getStart(ast));
      if (
        /^(borderRadius|fontFamily|fontSize|shadowRadius|shadowOpacity|zIndex|duration|width|height|minWidth|minHeight|maxWidth|maxHeight|padding\w*|margin\w*)$/.test(
          key,
        ) &&
        (ts.isNumericLiteral(node.initializer) || ts.isStringLiteral(node.initializer)) &&
        value !== '0'
      )
        add('literal-design-value', node.getText(ast), node.getStart(ast));
    }
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'className' && node.initializer) {
      for (const m of node.initializer
        .getText(ast)
        .matchAll(
          /(?:[\w-]+:)*(?:bg|text|border|rounded|shadow|font|duration|z|size|h|w)-\[[^\]]+\]/g,
        )) {
        if (!/var\(--|\[--|inherit|100%/.test(m[0]))
          add('arbitrary-utility', m[0], node.getStart(ast));
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(ast);
  return result;
}
export const key = ({ path, kind, value }) => `${path}|${kind}|${value}`;
export function compare(current, baseline) {
  const counts = (rows) =>
    rows.reduce((map, row) => map.set(key(row), (map.get(key(row)) ?? 0) + 1), new Map());
  const before = counts(baseline),
    after = counts(current);
  return {
    added: [...after].filter(([k, n]) => n > (before.get(k) ?? 0)),
    fixed: [...before].filter(([k, n]) => n > (after.get(k) ?? 0)),
  };
}
export function checkDesign({ baseline = false } = {}) {
  const paths = ['apps/web/src', 'apps/mobile/src']
    .flatMap(files)
    .filter((p) => /\.(tsx?|css)$/.test(p) && !/\.(test|spec)\.|\/generated\//.test(p));
  const rows = paths.flatMap((path) => findings(path, readFileSync(path, 'utf8')));
  const file = 'scripts/design-baseline.json';
  if (baseline) writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
  const diff = compare(rows, JSON.parse(readFileSync(file, 'utf8')));
  mkdirSync('artifacts/ui-audit', { recursive: true });
  writeFileSync(
    'artifacts/ui-audit/design-check.json',
    JSON.stringify({ files: paths.length, findings: rows, ...diff }, null, 2) + '\n',
  );
  console.log(
    `Design check: ${paths.length} files, ${rows.length} baseline findings, ${diff.added.length} new groups, ${diff.fixed.length} improved groups.`,
  );
  if (diff.added.length)
    throw new Error(`New design violations:\n${diff.added.map(([k]) => k).join('\n')}`);
  return diff;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  checkDesign({ baseline: process.argv.includes('--baseline') });
