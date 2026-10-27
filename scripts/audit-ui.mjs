import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { checkParity } from './check-parity.mjs';
import { readFileSync } from 'node:fs';

// Source inventory, not a substitute for rendered/role/device qualification.
async function walk(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else if (/\.(tsx?|css)$/.test(path)) result.push(path);
  }
  return result;
}
const records = [];
for (const path of (await Promise.all(['apps/web/src', 'apps/mobile/src'].map(walk))).flat()) {
  const source = await readFile(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const imports = [];
  if (!path.endsWith('.css')) {
    for (const node of ast.statements) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier))
        imports.push({ from: node.moduleSpecifier.text, binding: node.importClause?.getText(ast) });
    }
  }
  const findings = [];
  source.split('\n').forEach((line, index) => {
    if (/(?:color|background|fill|stroke)\s*[:=].*#[0-9a-f]{3,8}\b/i.test(line))
      findings.push({ line: index + 1, kind: 'literal-color-review', code: line.trim() });
    if (/font-size:\s*var\(--font-[\w-]+\)/.test(line))
      findings.push({ line: index + 1, kind: 'unscaled-text-token', code: line.trim() });
    if (/className=["']status-badge["']/.test(line))
      findings.push({ line: index + 1, kind: 'undefined-badge-class', code: line.trim() });
    if (/borderRadius:.*tokens\[['"]surface-radius/.test(line))
      findings.push({ line: index + 1, kind: 'unresolved-native-radius', code: line.trim() });
  });
  records.push({ path, lines: source.split('\n').length, imports, findings });
}
const parity = checkParity(
  (path) => readFileSync(path, 'utf8'),
  JSON.parse(readFileSync('scripts/parity-exceptions.json', 'utf8')),
);
const report = {
  generatedAt: new Date().toISOString(),
  method:
    'All web/mobile TS, TSX and CSS files read; imports and limited style patterns scanned. Not a semantic or visual approval of every component.',
  routes: {
    sharedCount: parity.registryCount,
    web: [...parity.coverage.web.routes],
    mobile: [...parity.coverage.mobile.routes],
    mismatches: parity.mismatches,
    errors: parity.errors,
  },
  files: records,
};
await mkdir('artifacts/ui-audit', { recursive: true });
await writeFile('artifacts/ui-audit/source-inventory.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  `Scanned ${records.length} source files; ${records.reduce((n, r) => n + r.findings.length, 0)} review findings. See artifacts/ui-audit/source-inventory.json.`,
);

const blocking = records.flatMap((record) =>
  record.findings
    .filter((finding) => finding.kind !== 'literal-color-review')
    .map((finding) => `${record.path}:${finding.line} ${finding.kind}`),
);
if (blocking.length) {
  console.error(blocking.join('\n'));
  process.exitCode = 1;
}
