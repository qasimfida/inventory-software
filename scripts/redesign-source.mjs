import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import ts from 'typescript';
import { parse, walk } from './parity-source.mjs';
export const read = (path) => readFileSync(path, 'utf8');
export function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? ['generated', 'node_modules', 'dist'].includes(e.name)
        ? []
        : files(join(root, e.name))
      : [join(root, e.name)],
  );
}
export function imports(path) {
  const result = [];
  walk(parse(read(path), path), (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier))
      result.push({ from: n.moduleSpecifier.text, names: n.importClause?.getText() ?? '' });
    if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(n.arguments[0])
    )
      result.push({ from: n.arguments[0].text, names: 'lazy import' });
  });
  return result;
}
function resolveImport(path, specifier) {
  const base = specifier.startsWith('@/')
    ? `apps/web/src/${specifier.slice(2)}`
    : specifier.startsWith('.')
      ? normalize(join(dirname(path), specifier))
      : null;
  if (!base) return null;
  return [base, `${base}.tsx`, `${base}.ts`, `${base}/index.ts`, base.replace(/\.js$/, '.ts')].find(
    (p) => /\.tsx?$/.test(p) && existsSync(p),
  );
}
export function closure(roots) {
  const visited = new Set(),
    queue = [...roots];
  while (queue.length) {
    const path = queue.pop();
    if (visited.has(path)) continue;
    if (!existsSync(path)) throw new Error(`Missing source: ${path}`);
    visited.add(path);
    for (const imp of imports(path)) {
      const next = resolveImport(path, imp.from);
      if (next && next.startsWith('apps/')) queue.push(next);
    }
  }
  return [...visited].sort();
}
export function symbols(path) {
  const tree = parse(read(path), path),
    names = new Set();
  walk(tree, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text))
      names.add(node.name.text);
    if (
      ts.isVariableDeclaration(node) &&
      /^[A-Z]/.test(node.name.getText()) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer) ||
        ts.isCallExpression(node.initializer))
    )
      names.add(node.name.getText());
  });
  return [...names].sort();
}

export const cell = (s) => String(s).replaceAll('|', '&#124;').replaceAll('\n', ' ');
